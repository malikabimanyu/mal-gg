import * as THREE from "three";
import { CHARACTERS, CHASER, getCharacter } from "../lib/characters";
import { loadSave, peekSave, SAVE_KEY, writeSave, type SaveData } from "../lib/save";
import type { GameApi, GameStore, PowerUpKind, Screen } from "../lib/store";
import { GameAudio } from "./audio";
import { CameraRig } from "./camera";
import { Hit } from "./collision";
import { COIN, LANES, MOVE, OBSTACLE, POWERUP, TIMING, WORLD, speedAt, type Lane } from "./config";
import { createCurve, type Curve } from "./curve";
import { Autopilot } from "./debug";
import { Chaser } from "./entities/chaser";
import { CoinField } from "./entities/coins";
import { ObstacleField } from "./entities/obstacles";
import { Player } from "./entities/player";
import { PowerUpField } from "./entities/powerups";
import { createVisualKit, type VisualKit } from "./entities/visuals";
import { Input } from "./input";
import { ModelLibrary, type LoadedModel } from "./models";
import { applyAction, copyBody, createBody, stepBody, type StepInfo } from "./motor";
import type { EnvAssets } from "./world/env-assets";
import { createRng, pickRng, randomSeed, type Rng } from "./rng";
import { Spawner } from "./spawner";
import type { BodyAction, InputAction } from "./types";
import { createWorld, type World } from "./world";
import { loadEnvAssets } from "./world/env-assets";

/**
 * The game: renderer, scene, loop, state machine, and the wiring between subsystems. Never
 * imports React — the UI reads `store` and calls the GameApi methods.
 *
 * Screens: loading → menu ⇄ shop / credits; menu → running ⇄ paused; running → caught → over;
 * over → running / menu / shop.
 */

export interface GameOptions {
  /** Deterministic runs (?seed=123). */
  seed?: number;
}

const POWER_KINDS: PowerUpKind[] = ["magnet", "sneakers", "multiplier", "jetpack"];
/**
 * Longest the loading screen waits for any one asset. Every asset has a fallback (placeholder
 * model, env, synth audio), so a request that hangs on a flaky connection must not hold the
 * game hostage; the real asset is swapped in if it arrives later.
 */
const LOAD_TIMEOUT_MS = 15000;

/** Resolves to `fallback()` when `p` hasn't settled within `ms`. */
function withTimeout<T>(p: Promise<T>, ms: number, fallback: () => T): Promise<T> {
  return new Promise((resolve) => {
    const t = setTimeout(() => resolve(fallback()), ms);
    p.then((v) => {
      clearTimeout(t);
      resolve(v);
    });
  });
}
const POWER_WEIGHTS: Record<PowerUpKind, number> = { magnet: 3, sneakers: 2, multiplier: 3, jetpack: 1.5 };

export class Game implements GameApi {
  readonly store: GameStore;
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly rig: CameraRig;
  private readonly curve: Curve;
  private readonly kit: VisualKit;
  private readonly world: World;
  private readonly models = new ModelLibrary();
  private readonly audio: GameAudio;
  private readonly input: Input;
  private readonly player: Player;
  private readonly chaser = new Chaser();
  private readonly obstacles: ObstacleField;
  private readonly coins: CoinField;
  private readonly powerups: PowerUpField;
  private readonly spawner: Spawner;
  private readonly rng: Rng;
  private readonly resizeObserver: ResizeObserver;
  private save: SaveData;
  private screen: Screen = "loading";
  private disposed = false;
  private raf = 0;
  private last = 0;
  private time = 0;

  // Run state
  private runTime = 0;
  private speed: number = speedAt(0);
  private score = 0;
  private coinsRun = 0;
  private readonly powerT: Record<PowerUpKind, number> = { magnet: 0, sneakers: 0, multiplier: 0, jetpack: 0 };
  private hudT = 0;
  private caughtT = 0;
  private caughtSpeed = 0;
  private stumbleCooldown = 0;
  private coinStreak = 0;
  private lastCoinAt = -10;
  private readonly queue: BodyAction[] = [];
  private buffered: BodyAction | null = null;
  private bufferedT = 0;
  private readonly stepInfo: StepInfo = { landed: false };
  private readonly coarse: boolean;
  private previewToken = 0;
  private shownId = "";
  /** The shown model is the placeholder (a load failed or timed out): retry on the next show. */
  private shownPlaceholder = false;
  private envApplied = false;
  /** The current catch came from a second side-stumble (the body is still mid lane-change). */
  private caughtFromSide = false;
  /** One normalised instance per character, reused across previews (no per-preview GPU uploads). */
  private readonly modelCache = new Map<string, Promise<LoadedModel>>();
  private dprQuery: MediaQueryList | null = null;

  // Dev hooks
  invincible = false;
  speedOverride: number | null = null;
  autopilot: Autopilot | null = null;

  constructor(private readonly canvas: HTMLCanvasElement, store: GameStore, opts: GameOptions = {}) {
    this.store = store;
    this.save = loadSave();
    this.rng = createRng(opts.seed ?? randomSeed());
    this.coarse = window.matchMedia?.("(pointer: coarse)").matches ?? false;

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
    this.renderer.setPixelRatio(this.pixelRatio());
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    const parent = canvas.parentElement ?? canvas;
    const w = parent.clientWidth || window.innerWidth;
    const h = parent.clientHeight || window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.rig = new CameraRig(w / h);
    this.scene.add(this.rig.camera);

    this.curve = createCurve();
    this.kit = createVisualKit(this.curve);
    this.world = createWorld(this.scene, this.curve, this.rng);

    this.player = new Player(this.kit);
    this.player.addTo(this.scene);
    this.scene.add(this.chaser.root);
    this.obstacles = new ObstacleField(this.kit, this.scene);
    this.coins = new CoinField(this.kit, this.scene);
    this.powerups = new PowerUpField(this.kit, this.scene);
    this.spawner = new Spawner(this.rng, {
      obstacle: (kind, lane, z0, len, speed, zMeet) => this.obstacles.spawn(kind, lane, z0, len, speed, zMeet),
      coin: (x, y, z) => this.coins.spawn(x, y, z),
      powerUpSlot: (lane, z) => this.spawnPowerUp(lane, z),
    });

    this.audio = new GameAudio({ muted: this.save.muted, musicMuted: this.save.musicMuted });
    this.audio.resumeOnGesture();
    // Keys are game input only where the game uses them; on shop/credits/loading they keep
    // their normal meaning (arrows/Space/PageDown scroll the credits).
    this.input = new Input(canvas, (a, source) => this.onInput(a, source), () => this.wantsKeys());

    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(parent);
    document.addEventListener("visibilitychange", this.onVisibility);
    window.addEventListener("blur", this.onBlur);
    window.addEventListener("storage", this.onStorage);
    this.watchDpr();

    this.rig.mode = "menu";
    this.rig.snap(this.player.body.x, 0);
    this.store.set({
      screen: "loading",
      loadProgress: 0,
      coins: this.save.coins,
      best: this.save.best,
      owned: this.save.owned,
      selected: this.save.selected,
      previewId: this.save.selected,
      muted: this.save.muted,
      musicMuted: this.save.musicMuted,
    });

    this.last = performance.now();
    this.raf = requestAnimationFrame(this.frame);
    void this.init();
  }

  // ── Loading ────────────────────────────────────────────────────────────────

  private async init() {
    const sel = getCharacter(this.save.selected);
    // Env, the selected runner, the cat and the SFX bytes; each step moves the bar by a quarter.
    let done = 0;
    const bump = <T,>(v: T) => {
      if (!this.disposed) this.store.set({ loadProgress: ++done / 4 });
      return v;
    };
    const runnerP = this.modelFor(sel.id);
    const catP = this.models.load(CHASER);
    const envP = loadEnvAssets(this.curve);
    const [pm, cm, env] = await Promise.all([
      withTimeout(runnerP, LOAD_TIMEOUT_MS, () => this.models.placeholder(sel)).then(bump),
      withTimeout(catP, LOAD_TIMEOUT_MS, () => this.models.placeholder(CHASER)).then(bump),
      withTimeout<EnvAssets | null>(envP, LOAD_TIMEOUT_MS, () => null).then(bump),
      withTimeout(this.audio.preload(), LOAD_TIMEOUT_MS, () => undefined).then(bump),
    ]);
    if (this.disposed) {
      env?.dispose();
      return;
    }
    // Env models replace the placeholder world/obstacles before warmUp builds the pools.
    if (env) this.applyEnv(env);
    this.showModel(sel.id, pm);
    this.curve.patchObject(cm.root);
    this.chaser.setModel(cm);
    this.warmUp();
    this.setScreen("menu");
    // The music isn't needed until the first run: fetch it while the menu idles.
    this.audio.prefetchMusic();

    // Late arrivals after a timeout upgrade the placeholders in place.
    if (!env) {
      void envP.then((late) => {
        if (!late) return;
        if (this.disposed || this.envApplied) late.dispose();
        else this.applyEnv(late);
      });
    }
    if (cm.placeholder) {
      void catP.then((late) => {
        if (this.disposed || late.placeholder) return;
        this.curve.patchObject(late.root);
        this.chaser.setModel(late);
      });
    }
    if (pm.placeholder) {
      void runnerP.then((late) => {
        if (!this.disposed && !late.placeholder && this.shownId === sel.id && this.shownPlaceholder) this.showModel(sel.id, late);
      });
    }
  }

  private applyEnv(env: EnvAssets) {
    this.envApplied = true;
    this.kit.useEnv(env);
    this.world.useEnv(env);
  }

  /**
   * Pre-builds the obstacle pools to their observed peak, compiles every shader and renders one
   * throw-away frame with everything visible and unculled, so geometry/texture uploads happen
   * on the loading screen instead of as hitches in the first seconds of a run.
   */
  private warmUp() {
    const z = this.player.body.z + 400;
    for (const len of OBSTACLE.trainLengths) {
      for (let k = 0; k < 4; k++) this.obstacles.spawn("train", 0, z, len, 0, 0);
      for (let k = 0; k < 2; k++) this.obstacles.spawn("trainMoving", 0, z, len, 10, z);
    }
    for (let k = 0; k < 6; k++) {
      this.obstacles.spawn("jump", 1, z, OBSTACLE.jumpLen, 0, 0);
      this.obstacles.spawn("roll", 1, z, OBSTACLE.rollLen, 0, 0);
      this.obstacles.spawn("ramp", 2, z, OBSTACLE.rampLen, 0, 0);
    }
    const hidden: THREE.Object3D[] = [];
    const culled: THREE.Object3D[] = [];
    this.scene.traverse((o) => {
      if (!o.visible) {
        hidden.push(o);
        o.visible = true;
      }
      if (o.frustumCulled) {
        culled.push(o);
        o.frustumCulled = false;
      }
    });
    this.renderer.compile(this.scene, this.rig.camera);
    this.renderer.render(this.scene, this.rig.camera);
    for (const o of hidden) o.visible = false;
    for (const o of culled) o.frustumCulled = true;
    this.obstacles.clear();
  }

  private modelFor(id: string): Promise<LoadedModel> {
    let m = this.modelCache.get(id);
    if (!m) {
      const p = this.models.load(getCharacter(id)).then((r) => {
        // A failed download isn't remembered: the next preview/run tries again.
        if (r.placeholder && this.modelCache.get(id) === p) this.modelCache.delete(id);
        return r;
      });
      m = p;
      this.modelCache.set(id, m);
    }
    return m;
  }

  private showModel(id: string, model: LoadedModel) {
    const def = getCharacter(id);
    this.curve.patchObject(model.root);
    this.player.setModel(model, def.clips, def.hover);
    this.curve.patchObject(this.player.gear);
    this.shownId = id;
    this.shownPlaceholder = model.placeholder;
  }

  private async loadAndShow(id: string) {
    // Bump first: a request for the already-shown character must still cancel an older,
    // slower load (◀ then ▶ back) or that load would land on stage under the wrong label.
    const token = ++this.previewToken;
    if (id === this.shownId && !this.shownPlaceholder) {
      this.store.set({ previewLoading: false });
      return;
    }
    this.store.set({ previewLoading: true });
    const model = await this.modelFor(id);
    if (this.disposed || token !== this.previewToken) return;
    this.showModel(id, model);
    this.store.set({ previewLoading: false });
  }

  // ── Public API (GameApi) ───────────────────────────────────────────────────

  start(): void {
    if (this.screen !== "menu" && this.screen !== "over" && this.screen !== "shop") return;
    if (this.shownId !== this.save.selected || this.shownPlaceholder) void this.loadAndShow(this.save.selected);
    this.resetRun();
    this.rig.mode = "chase";
    this.audio.play("click");
    this.audio.startMusic();
    this.setScreen("running");
    this.pushHud();
  }

  pause(): void {
    if (this.screen !== "running") return;
    this.audio.setLoop("jetpack", false);
    this.audio.duckMusic(true);
    this.setScreen("paused");
  }

  resume(): void {
    if (this.screen !== "paused") return;
    this.last = performance.now();
    if (this.powerT.jetpack > 0) this.audio.setLoop("jetpack", true);
    this.audio.startMusic();
    this.setScreen("running");
  }

  toMenu(): void {
    if (this.screen === "running" || this.screen === "caught" || this.screen === "loading") return;
    if (this.screen === "paused") this.commitRun();
    this.audio.stopMusic();
    this.audio.setLoop("jetpack", false);
    this.clearTrack();
    this.rig.mode = "menu";
    if (this.shownId !== this.save.selected) void this.loadAndShow(this.save.selected);
    this.setScreen("menu");
  }

  openShop(): void {
    if (this.screen !== "menu" && this.screen !== "over") return;
    this.clearTrack();
    this.rig.mode = "shop";
    this.store.set({ previewId: this.save.selected });
    this.setScreen("shop");
  }

  closeShop(): void {
    if (this.screen !== "shop") return;
    this.previewToken++;
    // The cancelled preview load never clears its spinner flag; loadAndShow sets it again if needed.
    this.store.set({ previewId: this.save.selected, previewLoading: false });
    if (this.shownId !== this.save.selected) void this.loadAndShow(this.save.selected);
    this.rig.mode = "menu";
    this.setScreen("menu");
  }

  previewCharacter(id: string): void {
    if (!CHARACTERS.some((c) => c.id === id)) return;
    this.store.set({ previewId: id });
    void this.loadAndShow(id);
  }

  buyCharacter(id: string): boolean {
    this.refreshSave();
    const def = CHARACTERS.find((c) => c.id === id);
    if (!def || this.save.owned.includes(id) || this.save.coins < def.price) {
      this.audio.play("error");
      return false;
    }
    this.save.coins -= def.price;
    this.save.owned = [...this.save.owned, id];
    this.save.selected = id;
    this.persist();
    this.audio.play("purchase");
    return true;
  }

  selectCharacter(id: string): void {
    if (!this.save.owned.includes(id)) return;
    this.save.selected = id;
    this.persist();
    this.audio.play("click");
    if (this.screen !== "shop") void this.loadAndShow(id);
  }

  setMuted(muted: boolean): void {
    this.save.muted = muted;
    this.audio.setMuted(muted);
    this.persist();
  }

  setMusicMuted(muted: boolean): void {
    this.save.musicMuted = muted;
    this.audio.setMusicMuted(muted);
    this.persist();
  }

  openCredits(): void {
    if (this.screen !== "menu") return;
    this.setScreen("credits");
  }

  closeCredits(): void {
    if (this.screen !== "credits") return;
    this.setScreen("menu");
  }

  dispose(): void {
    if (this.disposed) return;
    if (this.screen === "running" || this.screen === "paused") this.commitRun();
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    this.input.dispose();
    this.audio.dispose();
    this.resizeObserver.disconnect();
    document.removeEventListener("visibilitychange", this.onVisibility);
    window.removeEventListener("blur", this.onBlur);
    window.removeEventListener("storage", this.onStorage);
    this.dprQuery?.removeEventListener("change", this.onDprChange);
    this.dprQuery = null;
    // Everything under the scene, then the kits' shared resources.
    const seen = new Set<{ dispose(): void }>();
    this.scene.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (mesh.geometry) seen.add(mesh.geometry);
      const mats = mesh.material ? (Array.isArray(mesh.material) ? mesh.material : [mesh.material]) : [];
      for (const m of mats) {
        seen.add(m);
        for (const v of Object.values(m)) if (v instanceof THREE.Texture) seen.add(v);
      }
      if ((o as THREE.InstancedMesh).isInstancedMesh) seen.add(o as THREE.InstancedMesh);
    });
    for (const r of seen) r.dispose();
    this.kit.dispose();
    this.world.dispose();
    this.models.dispose();
    this.scene.clear();
    this.renderer.dispose();
  }

  /** Dev/test: queue an action exactly like a key press. */
  act(a: BodyAction): void {
    if (this.screen === "running") this.queue.push(a);
  }

  /** Dev/test: grant a power-up as if picked up. */
  debugPowerUp(kind: PowerUpKind): void {
    if (this.screen === "running") this.activatePowerUp(kind);
  }

  /** Dev/test: a few live numbers. */
  debugState() {
    const b = this.player.body;
    return {
      screen: this.screen,
      runTime: this.runTime,
      speed: this.speed,
      score: Math.round(this.score),
      coinsRun: this.coinsRun,
      z: b.z,
      lane: b.lane,
      y: b.y,
      obstacles: this.obstacles.count,
      coins: this.coins.count,
      chase: this.chaser.chaseActive,
      powerUps: { ...this.powerT },
      drawCalls: this.renderer.info.render.calls,
      triangles: this.renderer.info.render.triangles,
      audio: this.audio.debugInfo(),
    };
  }

  // ── Input ──────────────────────────────────────────────────────────────────

  private wantsKeys(): boolean {
    return this.screen !== "shop" && this.screen !== "credits" && this.screen !== "loading";
  }

  private onInput(a: InputAction, source: "key" | "swipe" | "tap") {
    switch (this.screen) {
      case "menu":
        if (a !== "pause") this.start();
        break;
      case "over":
        if (a === "confirm" && source === "key") this.start();
        break;
      case "running":
        if (a === "pause") this.pause();
        else if (a !== "confirm") this.queue.push(a);
        break;
      case "paused":
        if (a === "pause" || (a === "confirm" && source === "key")) this.resume();
        break;
    }
  }

  private readonly onVisibility = () => {
    if (document.visibilityState === "hidden") this.pause();
  };

  private readonly onBlur = () => this.pause();

  /** Another tab wrote the save: adopt it so this tab never writes stale coins/purchases back. */
  private readonly onStorage = (e: StorageEvent) => {
    if (e.key !== SAVE_KEY || this.disposed) return;
    if (!this.refreshSave()) return;
    this.publishSave();
    if ((this.screen === "menu" || this.screen === "over") && this.shownId !== this.save.selected) {
      void this.loadAndShow(this.save.selected);
    }
  };

  // ── Loop ───────────────────────────────────────────────────────────────────

  private readonly frame = (now: number) => {
    if (this.disposed) return;
    this.raf = requestAnimationFrame(this.frame);
    const dt = Math.min((now - this.last) / 1000, TIMING.maxDt);
    this.last = now;
    if (dt <= 0) return;
    this.time += dt;
    switch (this.screen) {
      case "running":
        this.runStep(dt);
        break;
      case "caught":
        this.caughtStep(dt);
        break;
      case "paused":
        // Nothing moves: the canvas keeps showing the last frame (resize redraws it itself).
        return;
      default:
        this.idleStep(dt);
    }
    this.renderer.render(this.scene, this.rig.camera);
  };

  /** Menu / shop / credits / over / loading: idle character, spinning cat, gentle camera. */
  private idleStep(dt: number) {
    const b = this.player.body;
    const over = this.screen === "over";
    if (!over) this.player.sync(dt, 0, this.screen === "shop" ? "shop" : "idle", this.time);
    else this.player.sync(dt, 0, null, this.time);
    this.chaser.update(dt, b.x, b.z, b.ground, over ? "caught" : "menu");
    this.chaser.root.visible = this.screen !== "shop";
    this.updateView(dt);
  }

  private updateView(dt: number) {
    const b = this.player.body;
    // Jetpack: the camera rises with the flyer (its feet become the "ground").
    this.rig.update(dt, b.x, b.z, b.jet > 0 ? b.y : b.ground, b.laneVel);
    const cam = this.rig.camera.position;
    this.curve.update(cam.z, this.time);
    this.world.update(this.rig.camera, dt);
  }

  private runStep(dt: number) {
    const b = this.player.body;
    this.runTime += dt;
    this.speed = this.speedOverride ?? speedAt(this.runTime);
    if (this.stumbleCooldown > 0) this.stumbleCooldown -= dt;

    this.autopilot?.update(dt, b, this.obstacles.data, this.obstacles.count, this.speed, (a) => this.queue.push(a));

    // Fresh input first; jump/roll that can't apply yet waits in the buffer.
    for (const a of this.queue) this.tryAction(a);
    this.queue.length = 0;

    const n = Math.max(1, Math.ceil(dt / TIMING.substep - 1e-6));
    const h = dt / n;
    for (let i = 0; i < n; i++) {
      if (this.buffered) {
        this.bufferedT -= h;
        if (this.bufferedT <= 0) this.buffered = null;
        else {
          const r = applyAction(b, this.buffered);
          if (r === "applied") this.afterAction(this.buffered);
          if (r !== "buffer") this.buffered = null;
        }
      }
      const wasGrounded = b.grounded;
      const hit = stepBody(b, this.obstacles.data, this.obstacles.count, this.speed, h, 0, this.invincible, this.stepInfo);
      if (hit === Hit.Crash) {
        this.caught("crash");
        return;
      }
      if (hit === Hit.Stumble) {
        if (this.stumble()) return;
      }
      if (this.stepInfo.landed && !wasGrounded) this.audio.play("land", { volume: 0.6 });
    }

    // Floating origin before anything visual is placed for this frame, so the rendered frame
    // is consistent (player, cat, ground, rails, sky and curve all see the shifted z).
    if (b.z < -WORLD.originShift) this.shiftOrigin(WORLD.originShift);

    const camZ = this.rig.camera.position.z;
    this.obstacles.update(b.z, this.speed, camZ);
    this.spawner.update(b.z, this.runTime);

    const got = this.coins.update(dt, b, this.powerT.magnet > 0, camZ);
    if (got > 0) {
      this.coinStreak = this.time - this.lastCoinAt < COIN.streakWindow ? this.coinStreak + got : 0;
      this.lastCoinAt = this.time;
      this.coinsRun += got;
      // Each coin is worth +1 score, never multiplied.
      this.score += got;
      this.audio.coin(this.coinStreak);
    }
    const kind = this.powerups.update(dt, b, camZ);
    if (kind) this.activatePowerUp(kind);
    this.tickPowerUps(dt);

    const mult = this.powerT.multiplier > 0 ? 2 : 1;
    this.score += this.speed * dt * mult * 0.5;

    this.chaser.update(dt, b.x, b.z, b.ground, "run");
    this.kit.tick(this.time);
    this.audio.setSpeed(this.speed);
    if (this.chaser.chaseActive) this.audio.chaseTaunt();
    this.player.sync(dt, this.speed, null, this.time);
    this.updateView(dt);

    this.hudT -= dt;
    if (this.hudT <= 0) {
      this.hudT = TIMING.hudInterval;
      this.pushHud();
    }
  }

  private tryAction(a: BodyAction) {
    const b = this.player.body;
    // The latest vertical input wins: a newer jump/roll drops whatever is still buffered, so
    // an early mid-air jump press can't fire on landing and cancel the slam-roll chosen after it.
    if (a === "up" || a === "down") this.buffered = null;
    const r = applyAction(b, a);
    // An ignored press (into the edge wall, up/down on the jetpack) stays silent.
    if (r === "applied") this.afterAction(a);
    else if (r === "buffer") {
      this.buffered = a;
      this.bufferedT = MOVE.bufferTime;
    }
  }

  private afterAction(a: BodyAction) {
    switch (a) {
      case "up":
        this.audio.play("jump");
        break;
      case "down":
        this.audio.play("roll");
        break;
      default:
        this.audio.play("swipe");
    }
  }

  /** Returns true when the stumble ended the run. */
  private stumble(): boolean {
    this.rig.shake(0.55);
    this.player.stumbleT = 0;
    if (this.stumbleCooldown > 0) return false;
    this.stumbleCooldown = TIMING.stumbleCooldown;
    if (this.chaser.chaseActive) {
      this.caught("stumble");
      return true;
    }
    this.audio.play("stumble");
    this.chaser.startChase();
    this.pushHud();
    return false;
  }

  private caught(reason: "crash" | "stumble") {
    this.caughtFromSide = reason === "stumble";
    this.audio.play("crash");
    this.audio.oiia();
    this.audio.setLoop("jetpack", false);
    this.audio.duckMusic(true);
    this.rig.shake(1);
    this.rig.mode = "caught";
    this.player.caught = true;
    this.caughtT = 0;
    this.caughtSpeed = Math.min(this.speed, 12);
    this.buffered = null;
    this.commitRun();
    this.setScreen("caught");
  }

  private caughtStep(dt: number) {
    const b = this.player.body;
    this.caughtT += dt;
    // Knocked back a little, then still.
    this.caughtSpeed = Math.max(0, this.caughtSpeed - dt * 40);
    b.z += this.caughtSpeed * dt * 0.3;
    // A side-stumble froze x mid lane-change, half inside the neighbouring lane: finish the
    // bounce into the lane it came from so the knock-out isn't hidden by the train it hit.
    if (this.caughtFromSide && b.laneT < 1) {
      b.laneT = Math.min(1, b.laneT + dt / (MOVE.laneTime * 1.6));
      const t = 1 - (1 - b.laneT) ** 3;
      b.x = b.fromX + (LANES[b.lane] - b.fromX) * t;
    }
    if (!b.grounded) {
      b.vy -= MOVE.gravity * dt;
      b.y = Math.max(b.ground, b.y + b.vy * dt);
      if (b.y <= b.ground) b.grounded = true;
    }
    this.player.sync(dt, 0, null, this.time);
    this.chaser.update(dt, b.x, b.z, b.ground, "caught");
    this.updateView(dt);
    if (this.caughtT >= TIMING.caughtTime) {
      this.audio.stopMusic(0.6);
      this.audio.play(this.store.get().lastRun?.newBest ? "newBest" : "gameOver");
      this.setScreen("over");
    }
  }

  // ── Run bookkeeping ────────────────────────────────────────────────────────

  private resetRun() {
    const b = this.player.body;
    const z = b.z;
    this.clearTrack();
    copyBody(b, createBody(1, z));
    this.spawner.reset(z);
    this.spawner.update(z, 0);
    this.runTime = 0;
    this.speed = speedAt(0);
    this.score = 0;
    this.coinsRun = 0;
    for (const k of POWER_KINDS) this.powerT[k] = 0;
    this.stumbleCooldown = 0;
    this.coinStreak = 0;
    this.queue.length = 0;
    this.buffered = null;
    this.hudT = 0;
    this.chaser.resetForRun();
    this.chaser.snapTo(b.x, 0);
    this.player.caught = false;
    this.player.anim.reset();
    this.store.set({ lastRun: null, chaseActive: false, powerUps: [], multiplier: 1, score: 0, coinsRun: 0 });
  }

  /** Empties the track and puts the character back on the centre lane, on the ground. */
  private clearTrack() {
    this.obstacles.clear();
    this.coins.clear();
    this.powerups.clear();
    const b = this.player.body;
    copyBody(b, createBody(1, b.z));
    this.player.caught = false;
    for (const k of POWER_KINDS) this.powerT[k] = 0;
    this.audio.setLoop("jetpack", false);
  }

  /** Adds the run's coins and best score to the save (once per run). */
  private commitRun() {
    // Merge onto the latest stored save (another tab may have earned or spent since).
    this.refreshSave();
    const score = Math.round(this.score);
    const newBest = score > this.save.best;
    this.save.coins += this.coinsRun;
    if (newBest) this.save.best = score;
    if (this.runTime > TIMING.easyTime) this.save.seenTutorial = true;
    this.persist();
    this.store.set({ lastRun: { score, coins: this.coinsRun, newBest }, tutorialHint: null, score, coinsRun: this.coinsRun });
  }

  /** Re-reads the stored save (if readable). Returns true when it was. */
  private refreshSave(): boolean {
    const fresh = peekSave();
    if (!fresh) return false;
    this.save = fresh;
    return true;
  }

  private persist() {
    writeSave(this.save);
    this.publishSave();
  }

  private publishSave() {
    this.store.set({
      coins: this.save.coins,
      best: this.save.best,
      owned: this.save.owned,
      selected: this.save.selected,
      muted: this.save.muted,
      musicMuted: this.save.musicMuted,
    });
  }

  private setScreen(screen: Screen) {
    this.screen = screen;
    this.store.set({ screen, loadProgress: screen === "loading" ? this.store.get().loadProgress : 1 });
  }

  private pushHud() {
    const powerUps = POWER_KINDS.filter((k) => this.powerT[k] > 0).map((kind) => ({
      kind,
      remaining: this.powerT[kind],
      duration: POWERUP.durations[kind],
    }));
    this.store.set({
      score: Math.round(this.score),
      coinsRun: this.coinsRun,
      multiplier: this.powerT.multiplier > 0 ? 2 : 1,
      powerUps,
      chaseActive: this.chaser.chaseActive,
      tutorialHint: this.tutorialHint(),
    });
  }

  private tutorialHint(): string | null {
    if (this.save.seenTutorial) return null;
    const t = this.runTime;
    const verb = this.coarse ? "Swipe" : "Press";
    if (t > 0.6 && t < 3.6) return `${verb} ← → to switch lanes`;
    if (t > 3.9 && t < 6.9) return this.coarse ? "Swipe ↑ to jump" : "Press ↑ or Space to jump";
    if (t > 7.2 && t < 10) return `${verb} ↓ to roll`;
    return null;
  }

  // ── Power-ups ──────────────────────────────────────────────────────────────

  private spawnPowerUp(lane: Lane, z: number) {
    let total = 0;
    for (const k of POWER_KINDS) if (!this.powerups.hasLive(k)) total += POWER_WEIGHTS[k];
    if (total <= 0) return;
    let r = this.rng() * total;
    for (const k of POWER_KINDS) {
      if (this.powerups.hasLive(k)) continue;
      r -= POWER_WEIGHTS[k];
      if (r <= 0) {
        this.powerups.spawn(k, LANES[lane], 1.0, z);
        return;
      }
    }
  }

  private activatePowerUp(kind: PowerUpKind) {
    const b = this.player.body;
    this.powerT[kind] = POWERUP.durations[kind];
    this.audio.play("powerup");
    if (kind === "sneakers") b.sneakers = true;
    if (kind === "jetpack") {
      b.jet = POWERUP.durations.jetpack;
      b.rollT = 0;
      this.audio.setLoop("jetpack", true);
      this.spawnSkyCoins();
      this.clearLanding();
    }
    this.pushHud();
  }

  /**
   * Keeps the stretch where the jetpack ends empty: from just before the fall ends until the
   * post-flight invulnerability runs out (plus margin). Content already there (≥ 120 m ahead,
   * in the fog) is removed; the spawner skips chunks that would reach into it.
   */
  private clearLanding() {
    const v = this.speedOverride ?? speedAt(this.runTime + POWERUP.durations.jetpack);
    const zEnd = this.player.body.z - this.player.body.jet * v;
    const zNear = zEnd - 0.25 * v;
    const zFar = zEnd - (POWERUP.jetInvuln + 0.6) * v;
    this.obstacles.clearRange(zFar, zNear, v);
    this.spawner.keepClear(zFar, zNear);
  }

  /** A zig-zag coin trail at jetpack height for the whole flight. */
  private spawnSkyCoins() {
    const b = this.player.body;
    const y = POWERUP.jetY + 0.85;
    const dist = POWERUP.durations.jetpack * this.speed - 25;
    let lane = b.lane as number;
    for (let d = 22; d < dist; d += COIN.spacing * 1.2) {
      if (Math.floor(d / 34) !== Math.floor((d - COIN.spacing * 1.2) / 34)) lane = pickRng(this.rng, [0, 1, 2].filter((l) => l !== lane));
      this.coins.spawn(LANES[lane], y, b.z - d);
    }
  }

  private tickPowerUps(dt: number) {
    const b = this.player.body;
    for (const k of POWER_KINDS) {
      if (this.powerT[k] <= 0) continue;
      this.powerT[k] = k === "jetpack" ? b.jet : Math.max(0, this.powerT[k] - dt);
      if (this.powerT[k] <= 0) {
        this.audio.play("powerupEnd");
        if (k === "sneakers") b.sneakers = false;
        if (k === "jetpack") this.audio.setLoop("jetpack", false);
        this.pushHud();
      }
    }
  }

  // ── Space ──────────────────────────────────────────────────────────────────

  private shiftOrigin(dz: number) {
    const b = this.player.body;
    b.z += dz;
    b.prevZ += dz;
    this.obstacles.shift(dz);
    this.coins.shift(dz);
    this.powerups.shift(dz);
    this.spawner.shift(dz);
    this.world.shift(dz);
    this.rig.shift(dz);
  }

  private pixelRatio() {
    return Math.min(window.devicePixelRatio || 1, this.coarse ? 1.5 : 2);
  }

  /** Re-arms a one-shot media query for the current DPR (zoom, moving between monitors). */
  private watchDpr() {
    this.dprQuery?.removeEventListener("change", this.onDprChange);
    this.dprQuery = window.matchMedia?.(`(resolution: ${window.devicePixelRatio || 1}dppx)`) ?? null;
    this.dprQuery?.addEventListener("change", this.onDprChange);
  }

  private readonly onDprChange = () => {
    if (this.disposed) return;
    this.watchDpr();
    this.resize();
  };

  private resize() {
    if (this.disposed) return;
    const parent = this.canvas.parentElement ?? this.canvas;
    const w = Math.max(1, parent.clientWidth);
    const h = Math.max(1, parent.clientHeight);
    this.renderer.setPixelRatio(this.pixelRatio());
    this.renderer.setSize(w, h, false);
    this.rig.resize(w / h);
    // setSize clears the drawing buffer and ResizeObserver runs after this frame's rAF:
    // redraw now or the cleared buffer gets composited (flash; frozen blank while paused).
    this.renderer.render(this.scene, this.rig.camera);
  }
}
