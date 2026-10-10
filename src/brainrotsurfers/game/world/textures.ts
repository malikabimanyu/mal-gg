import * as THREE from "three";
import type { Rng } from "../rng";

/**
 * Procedural canvas textures for the placeholder look. Each kit owns a TextureBag so the
 * engine can dispose everything it made (Strict Mode mounts the engine twice in dev).
 */
export class TextureBag {
  private readonly textures: THREE.Texture[] = [];

  canvas(w: number, h: number, draw: (ctx: CanvasRenderingContext2D) => void, opts: { repeat?: boolean; srgb?: boolean } = {}): THREE.CanvasTexture {
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    draw(c.getContext("2d")!);
    const t = new THREE.CanvasTexture(c);
    if (opts.srgb !== false) t.colorSpace = THREE.SRGBColorSpace;
    if (opts.repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.anisotropy = 4;
    this.textures.push(t);
    return t;
  }

  /** Adopts a texture made elsewhere (e.g. a clone with its own repeat). */
  track<T extends THREE.Texture>(t: T): T {
    this.textures.push(t);
    return t;
  }

  dispose(): void {
    for (const t of this.textures) t.dispose();
    this.textures.length = 0;
  }
}

/** Soft radial blob for fake shadows. */
export function blobTexture(bag: TextureBag): THREE.CanvasTexture {
  return bag.canvas(128, 128, (g) => {
    const grad = g.createRadialGradient(64, 64, 4, 64, 64, 62);
    grad.addColorStop(0, "rgba(20,10,40,0.55)");
    grad.addColorStop(0.55, "rgba(20,10,40,0.28)");
    grad.addColorStop(1, "rgba(20,10,40,0)");
    g.fillStyle = grad;
    g.fillRect(0, 0, 128, 128);
  });
}

/** Gravel ballast with a little noise; tiles every few metres. */
export function gravelTexture(bag: TextureBag, rng: Rng): THREE.CanvasTexture {
  return bag.canvas(256, 256, (g) => {
    g.fillStyle = "#b9a58e";
    g.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 2600; i++) {
      const v = 120 + Math.floor(rng() * 90);
      g.fillStyle = `rgb(${v + 20},${v + 8},${v - 10})`;
      const s = 1 + rng() * 3;
      g.fillRect(rng() * 256, rng() * 256, s, s);
    }
  }, { repeat: true });
}

/** Grass/dirt verge outside the track bed. */
export function vergeTexture(bag: TextureBag, rng: Rng): THREE.CanvasTexture {
  return bag.canvas(128, 128, (g) => {
    g.fillStyle = "#7fcf5a";
    g.fillRect(0, 0, 128, 128);
    for (let i = 0; i < 700; i++) {
      g.fillStyle = rng() < 0.5 ? "#6dbd4b" : "#92dc6a";
      g.fillRect(rng() * 128, rng() * 128, 2, 3 + rng() * 3);
    }
  }, { repeat: true });
}

/** Light paving slabs for the pavement between the track wall and the buildings. */
export function pavementTexture(bag: TextureBag, rng: Rng): THREE.CanvasTexture {
  return bag.canvas(128, 128, (g) => {
    g.fillStyle = "#e3ddd2";
    g.fillRect(0, 0, 128, 128);
    for (let i = 0; i < 500; i++) {
      g.fillStyle = rng() < 0.5 ? "rgba(255,255,255,0.35)" : "rgba(150,135,115,0.18)";
      g.fillRect(rng() * 128, rng() * 128, 2, 2);
    }
    // Two slabs per tile each way, offset rows like real paving.
    g.fillStyle = "#c4bcae";
    for (let r = 0; r < 2; r++) {
      g.fillRect(0, r * 64, 128, 3);
      const off = r % 2 ? 32 : 0;
      for (let c = 0; c < 2; c++) g.fillRect(off + c * 64, r * 64, 3, 64);
    }
  }, { repeat: true });
}

/** Train side: body colour, a stripe and a row of windows. Repeats along the car. */
export function trainSideTexture(bag: TextureBag, body: string, stripe: string): THREE.CanvasTexture {
  return bag.canvas(256, 128, (g) => {
    g.fillStyle = body;
    g.fillRect(0, 0, 256, 128);
    g.fillStyle = stripe;
    g.fillRect(0, 92, 256, 14);
    g.fillStyle = "rgba(255,255,255,0.25)";
    g.fillRect(0, 8, 256, 4);
    for (let i = 0; i < 4; i++) {
      const x = 12 + i * 62;
      g.fillStyle = "#1d2a44";
      g.beginPath();
      g.roundRect(x, 26, 46, 44, 8);
      g.fill();
      g.fillStyle = "rgba(160,220,255,0.55)";
      g.beginPath();
      g.roundRect(x + 4, 30, 18, 20, 5);
      g.fill();
    }
    g.fillStyle = "rgba(0,0,0,0.18)";
    g.fillRect(250, 0, 6, 128);
  }, { repeat: true });
}

/** Train front: windshield, headlights. */
export function trainFrontTexture(bag: TextureBag, body: string, stripe: string): THREE.CanvasTexture {
  return bag.canvas(128, 192, (g) => {
    g.fillStyle = body;
    g.fillRect(0, 0, 128, 192);
    g.fillStyle = "#1d2a44";
    g.beginPath();
    g.roundRect(14, 28, 100, 62, 12);
    g.fill();
    g.fillStyle = "rgba(160,220,255,0.6)";
    g.beginPath();
    g.roundRect(22, 34, 34, 22, 6);
    g.fill();
    g.fillStyle = stripe;
    g.fillRect(0, 128, 128, 16);
    g.fillStyle = "#fff6c2";
    g.beginPath();
    g.arc(26, 160, 10, 0, Math.PI * 2);
    g.arc(102, 160, 10, 0, Math.PI * 2);
    g.fill();
  });
}

/** Red/white hazard stripes for barriers. */
export function stripeTexture(bag: TextureBag): THREE.CanvasTexture {
  return bag.canvas(128, 32, (g) => {
    g.fillStyle = "#ffffff";
    g.fillRect(0, 0, 128, 32);
    g.fillStyle = "#ff3b3b";
    for (let x = -32; x < 160; x += 32) {
      g.beginPath();
      g.moveTo(x, 32);
      g.lineTo(x + 16, 32);
      g.lineTo(x + 32, 0);
      g.lineTo(x + 16, 0);
      g.closePath();
      g.fill();
    }
  }, { repeat: true });
}

/** Building facade: windows grid on white (tinted per instance). */
export function facadeTexture(bag: TextureBag): THREE.CanvasTexture {
  return bag.canvas(128, 128, (g) => {
    g.fillStyle = "#ffffff";
    g.fillRect(0, 0, 128, 128);
    for (let y = 0; y < 4; y++) {
      for (let x = 0; x < 4; x++) {
        g.fillStyle = "rgba(40,50,90,0.55)";
        g.fillRect(10 + x * 30, 10 + y * 30, 18, 20);
        g.fillStyle = "rgba(255,255,255,0.4)";
        g.fillRect(12 + x * 30, 12 + y * 30, 6, 8);
      }
    }
  }, { repeat: true });
}

/** "2x" label for the multiplier pickup. */
export function labelTexture(bag: TextureBag, text: string, bg: string, fg: string): THREE.CanvasTexture {
  return bag.canvas(128, 128, (g) => {
    g.fillStyle = bg;
    g.beginPath();
    g.arc(64, 64, 60, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = fg;
    g.font = "bold 64px system-ui, sans-serif";
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText(text, 64, 68);
  });
}

/** White radial glow (additive headlights, jet flames): bright core, soft falloff. */
export function glowTexture(bag: TextureBag): THREE.CanvasTexture {
  return bag.canvas(128, 128, (g) => {
    const grad = g.createRadialGradient(64, 64, 0, 64, 64, 63);
    grad.addColorStop(0, "rgba(255,255,255,1)");
    grad.addColorStop(0.18, "rgba(255,255,255,0.85)");
    grad.addColorStop(0.45, "rgba(255,255,255,0.25)");
    grad.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = grad;
    g.fillRect(0, 0, 128, 128);
  });
}

/**
 * Coin face matching the HUD coin (gold disc, darker rim ring, embossed star). The top-centre
 * texel row stays plain rim gold, so the coin's edge can sample it as a flat colour.
 */
export function coinFaceTexture(bag: TextureBag): THREE.CanvasTexture {
  return bag.canvas(128, 128, (g) => {
    g.fillStyle = "#f2a900";
    g.fillRect(0, 0, 128, 128);
    const face = g.createRadialGradient(52, 48, 6, 64, 64, 60);
    face.addColorStop(0, "#fff1a0");
    face.addColorStop(0.55, "#ffcb2b");
    face.addColorStop(1, "#f2a900");
    g.fillStyle = face;
    g.beginPath();
    g.arc(64, 64, 62, 0, Math.PI * 2);
    g.fill();
    g.lineWidth = 6;
    g.strokeStyle = "#d98a00";
    g.beginPath();
    g.arc(64, 64, 50, 0, Math.PI * 2);
    g.stroke();
    // Five-point star (the HUD icon's path, scaled from its 24-unit box).
    const pts = [12, 2.8, 14.75, 8.66, 21.15, 9.39, 16.4, 13.77, 17.7, 20.1, 12, 16.9, 6.3, 20.1, 7.6, 13.77, 2.85, 9.39, 9.25, 8.66];
    g.beginPath();
    for (let i = 0; i < pts.length; i += 2) {
      const x = 64 + (pts[i] - 12) * 3.6;
      const y = 66 + (pts[i + 1] - 12) * 3.6;
      if (i) g.lineTo(x, y);
      else g.moveTo(x, y);
    }
    g.closePath();
    g.fillStyle = "#e08e00";
    g.fill();
    g.lineWidth = 3;
    g.strokeStyle = "#b86e00";
    g.stroke();
  });
}
