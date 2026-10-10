#!/usr/bin/env node
/**
 * Brainrot Surfers — build the game's sound effects and music from the raw CC0 downloads.
 *
 *   node scripts/brainrotsurfers-audio-assets.mjs            # reads "SUBWAY SURVERS KW/audio/"
 *   node scripts/brainrotsurfers-audio-assets.mjs "<raw audio folder>"
 *
 * The raw folder (gitignored) holds the Kenney zips (digital-audio, interface-sounds,
 * impact-sounds, music-jingles), "oga_swishes.zip" (artisticdude) and the two "Fever Stadium"
 * loops (MintoDog) as .ogg. Only the members listed below are read out of the zips (as data,
 * via `unzip -p`) into a temp folder; nothing from the packs is executed or copied wholesale.
 *
 * Writes public/brainrotsurfers/audio/:
 *   sfx/<name>.mp3   mono 44.1 kHz 96 kbps; leading/trailing silence trimmed, peak-normalised to
 *                    -1 dBFS (the game sets per-sound levels), a few layered into one file.
 *   music-main.mp3, music-climax.mp3   stereo 96 kbps, untrimmed: both files are exact 59-bar
 *                    loops (165 / 180 BPM) with no silence at either end, so the game loops them
 *                    sample-accurately with loopStart/loopEnd (see TRACKS[].seconds in game/audio.ts —
 *                    this script prints the lengths to paste there if the sources ever change).
 *
 * Needs ffmpeg (with libmp3lame), ffprobe and unzip on PATH.
 */
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const rawDir = path.resolve(process.argv[2] ?? path.join(root, "SUBWAY SURVERS KW/audio"));
const out = path.join(root, "public/brainrotsurfers/audio");
const outSfx = path.join(out, "sfx");
mkdirSync(outSfx, { recursive: true });
const tmp = mkdtempSync(path.join(tmpdir(), "br-audio-"));

/** zip → member basenames we need (matched by basename so pack folder layouts don't matter). */
const MEMBERS = {
  "kenney_digital-audio.zip": ["powerUp9.ogg", "powerUp4.ogg"],
  "kenney_interface-sounds.zip": ["toggle_002.ogg", "confirmation_002.ogg", "error_006.ogg"],
  "kenney_impact-sounds.zip": [
    "impactSoft_medium_000.ogg",
    "impactPunch_medium_001.ogg",
    "impactPunch_heavy_000.ogg",
    "impactPlate_heavy_001.ogg",
    "impactGlass_heavy_003.ogg",
  ],
  "kenney_music-jingles.zip": ["jingles_NES12.ogg", "jingles_NES11.ogg"],
  "oga_swishes.zip": ["swish-3.wav", "swish-8.wav", "swish-13.wav"],
};

function run(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, { maxBuffer: 1 << 28, ...opts });
  if (r.status !== 0) {
    console.error(`${cmd} ${args.join(" ")}\n${r.stderr?.toString() ?? ""}`);
    process.exit(1);
  }
  return r;
}

for (const [zip, names] of Object.entries(MEMBERS)) {
  const zipPath = path.join(rawDir, zip);
  const list = run("unzip", ["-Z1", zipPath]).stdout.toString().split("\n");
  for (const name of names) {
    // Skip macOS resource forks (__MACOSX/._name) that share the basename.
    const member = list.find((m) => path.basename(m) === name && !m.includes("__MACOSX"));
    if (!member) {
      console.error(`${zip}: ${name} not found`);
      process.exit(1);
    }
    writeFileSync(path.join(tmp, name), run("unzip", ["-p", zipPath, member]).stdout);
  }
}
const src = (name) => path.join(tmp, name);

/** Max sample level in dB (volumedetect). */
function peakDb(file) {
  const err = run("ffmpeg", ["-hide_banner", "-nostats", "-i", file, "-af", "volumedetect", "-f", "null", "-"]).stderr.toString();
  return Number(/max_volume: (-?[\d.]+) dB/.exec(err)?.[1] ?? 0);
}

function duration(file) {
  return Number(run("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", file]).stdout.toString().trim());
}

// Trim silence at both ends (-50 dB in, -55 dB out so tails ring out) and fold to mono.
const TRIM =
  "silenceremove=start_periods=1:start_threshold=-50dB,areverse," +
  "silenceremove=start_periods=1:start_threshold=-55dB,areverse";
const MP3_SFX = ["-ac", "1", "-ar", "44100", "-c:a", "libmp3lame", "-b:a", "96k"];

/** Renders `filter` (inputs as [0:a], [1:a]…; output label [o]) to a WAV, then normalises + encodes. */
function sfx(name, inputs, filter) {
  const wav = path.join(tmp, `${name}.wav`);
  const args = ["-y", "-v", "error"];
  for (const i of inputs) args.push(...(i.lavfi ? ["-f", "lavfi", "-i", i.lavfi] : ["-i", i]));
  args.push("-filter_complex", filter, "-map", "[o]", "-ac", "1", "-ar", "44100", wav);
  run("ffmpeg", args);
  const gain = -1 - peakDb(wav);
  const mp3 = path.join(outSfx, `${name}.mp3`);
  run("ffmpeg", ["-y", "-v", "error", "-i", wav, "-af", `volume=${gain.toFixed(2)}dB`, ...MP3_SFX, mp3]);
  return mp3;
}

const single = (name, file, extra = "") => sfx(name, [src(file)], `[0:a]${TRIM}${extra}[o]`);

// Coin: synthesised (no pack has a bright pick-up "ding"): a short B6 grace note into a ringing
// E7, each with a quiet octave partial. 2 ms fade-in avoids a click at the very start.
const COIN =
  "aevalsrc=" +
  "'min(1,t/0.002)*if(lt(t,0.055)," +
  "0.55*(sin(2*PI*1975.5*t)+0.3*sin(2*PI*3951*t))*exp(-t*8)," +
  "0.6*(sin(2*PI*2637*t)+0.3*sin(2*PI*5274*t))*exp(-(t-0.055)*13))'" +
  ":s=44100:d=0.34";

const files = [
  sfx("coin", [{ lavfi: COIN }], "[0:a]anull[o]"),
  single("jump", "swish-3.wav"),
  single("roll", "swish-8.wav"),
  single("swipe", "swish-13.wav"),
  single("land", "impactSoft_medium_000.ogg"),
  single("stumble", "impactPunch_medium_001.ogg"),
  // Crash: punch body + metal plate (the train) + a glass splash on top, all from t=0.
  sfx(
    "crash",
    [src("impactPunch_heavy_000.ogg"), src("impactPlate_heavy_001.ogg"), src("impactGlass_heavy_003.ogg")],
    `[0:a]${TRIM}[a];[1:a]${TRIM},volume=0.8[b];[2:a]${TRIM},volume=0.45[c];` +
      "[a][b][c]amix=inputs=3:normalize=0:duration=longest[o]",
  ),
  single("powerup", "powerUp9.ogg"),
  single("powerupEnd", "powerUp4.ogg"),
  single("click", "toggle_002.ogg"),
  // Purchase: rising confirmation + a coin "ching" landing on its top note.
  sfx(
    "purchase",
    [src("confirmation_002.ogg"), { lavfi: COIN }],
    `[0:a]${TRIM}[a];[1:a]adelay=200,volume=0.7[b];[a][b]amix=inputs=2:normalize=0:duration=longest[o]`,
  ),
  single("error", "error_006.ogg"),
  single("newBest", "jingles_NES12.ogg"),
  single("gameOver", "jingles_NES11.ogg"),
];

const MUSIC = [
  ["music-main.mp3", "fever_stadium_bpm165.ogg"],
  ["music-climax.mp3", "fever_stadium_climax_bpm180.ogg"],
];
for (const [name, file] of MUSIC) {
  const input = path.join(rawDir, file);
  run("ffmpeg", ["-y", "-v", "error", "-i", input, "-ar", "44100", "-c:a", "libmp3lame", "-b:a", "96k", path.join(out, name)]);
  files.push(path.join(out, name));
  console.log(`${name}: loop ${duration(input).toFixed(6)} s (source length; TRACKS[].seconds in game/audio.ts)`);
}

rmSync(tmp, { recursive: true, force: true });

let sfxTotal = 0;
let total = 0;
for (const f of files) {
  const size = statSync(f).size;
  total += size;
  if (f.startsWith(outSfx)) sfxTotal += size;
  console.log(`${path.relative(root, f).padEnd(52)} ${duration(f).toFixed(3)} s  ${(size / 1024).toFixed(1)} KB`);
}
console.log(`sfx ${(sfxTotal / 1024).toFixed(1)} KB, total ${(total / 1024 / 1024).toFixed(2)} MB`);
