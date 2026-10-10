#!/usr/bin/env node
/**
 * Brainrot Surfers — build the world/obstacle/pickup models from the raw CC0/CC-BY packs.
 *
 *   node scripts/brainrotsurfers-env-assets.mjs
 *
 * Reads the raw downloads in "SUBWAY SURVERS KW/env/" (gitignored) and writes exactly two files:
 *   public/brainrotsurfers/models/env/env.glb        every prop as one named mesh
 *   public/brainrotsurfers/models/env/env-atlas.png  the one texture all of them share
 *
 * Why one atlas: the Kenney kits each ship a small palette texture ("colormap"), so packing
 * the palettes (plus recoloured building variants, hazard stripes, a "2x" badge and flat
 * swatches for the untextured Poly Pizza props) into one image lets the game draw a whole
 * train, a whole street block or a barrier with ONE material — one draw call per object.
 * Everything is baked here: node transforms applied, UVs remapped into the atlas, sizes
 * normalised to metres (trains: x/y in metres, z normalised to one unit per car so the game
 * can stretch cars to any train length). Train cars are fitted to the gameplay box by
 * measuring them (raycasts): the roof along the centre line lands exactly on TRAIN_H, roof
 * clutter above it is flattened, and the body side sits ~1 m from the centre, so what the
 * runner stands on and crashes into is what the collision box says. Only the chosen files are extracted from the zips
 * (into a temp dir, deleted afterwards); nothing in them is executed.
 *
 * The merged GLB is then compressed with `gltf-transform meshopt` (pinned, fetched by npx) —
 * quantised + EXT_meshopt_compression, decoded in the game by three's MeshoptDecoder.
 * Needs: unzip, npx (network on first run). Uses three + sharp from the repo's node_modules —
 * sharp is only present as Next's optional dependency, so an install with --omit=optional
 * needs `npm i -D sharp` (any 0.3x) before this script runs.
 *
 * Sources (credit in the game's Credits screen):
 * - Kenney Train Kit, City Kit (Commercial), City Kit (Roads), Platformer Kit — CC0 (kenney.nl)
 * - "Magnet" by Poly by Google, CC BY 3.0 — https://poly.pizza/m/dD2RIIea6WR (recoloured)
 * - "Trainer" by jeremy, CC BY 3.0 — https://poly.pizza/m/cs7k_ENAZjQ (recoloured green)
 * - "Jetpack" by Poly by Google, CC BY 3.0 — https://poly.pizza/m/a19dX3Vgo3S (texture baked
 *   to flat colours, recoloured)
 */
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import * as THREE from "three";
import { mergeGeometries, mergeVertices } from "three/addons/utils/BufferGeometryUtils.js";

const GLTF_TRANSFORM = "@gltf-transform/cli@4.5.1";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const RAW = path.join(ROOT, "SUBWAY SURVERS KW", "env");
const OUT = path.join(ROOT, "public", "brainrotsurfers", "models", "env");

/** Gameplay sizes (keep in sync with src/brainrotsurfers/game/config.ts → OBSTACLE). */
const TRAIN_H = 3.4;
const BARRIER_W = 2.0;
const JUMP_H = 1.0;
const JUMP_LEN = 0.4;
const ROLL_BOTTOM = 1.15;
const ROLL_TOP = 2.6;
const RAMP_LEN = 7;
const RAMP_W = 2.0;

/** City-kit units → metres (one storey ≈ 3 m). */
const CITY = 7.5;

// ── Atlas layout ─────────────────────────────────────────────────────────────
// 1024² image: the train palette keeps its full 512 px (it has 1-px details); the other
// palettes only use ≥ 32 px swatches, so they are stored at 256 px.
const ATLAS = 1024;
const TILE = {
  train: [0, 0, 512],
  wall0: [512, 0, 256],
  wall1: [768, 0, 256],
  wall2: [512, 256, 256],
  wall3: [768, 256, 256],
  wall4: [0, 512, 256],
  wall5: [256, 512, 256],
  wall6: [512, 512, 256],
  wall7: [768, 512, 256],
  roads: [0, 768, 256],
  platformer: [256, 768, 256],
  custom: [512, 768, 256],
  solids: [768, 768, 256],
};
/**
 * Building wall colours: 0 = Kenney white, 1/2 = Kenney variations A (tan) / B (brick), the rest
 * recoloured here. Each is a full copy of the commercial palette, so a building switches
 * colour by offsetting its UVs by one tile (the game reads the offsets from the GLB extras).
 */
const WALLS = [
  { tile: "wall0", from: "base" },
  { tile: "wall1", from: "variation-a" },
  { tile: "wall2", from: "variation-b" },
  { tile: "wall3", from: "variation-a", wall: "#ff9fc4" },
  { tile: "wall4", from: "variation-b", wall: "#86e3c3" },
  { tile: "wall5", from: "variation-a", wall: "#8fc9ff" },
  { tile: "wall6", from: "variation-b", wall: "#ffd76a" },
  { tile: "wall7", from: "base", wall: "#c3a8ff" },
];
/** Custom tile regions, in tile pixels: [x, y, w, h]. */
const REGION = {
  stripesRed: [0, 0, 256, 48],
  stripesYellow: [0, 48, 256, 48],
  badge2x: [0, 96, 128, 128],
};

// ── Sources ──────────────────────────────────────────────────────────────────

const PACKS = {
  train: "kenney_train-kit.zip",
  commercial: "kenney_city-kit-commercial.zip",
  roads: "kenney_city-kit-roads.zip",
  platformer: "kenney_platformer-kit.zip",
};
const PACK_TILE = { train: "train", commercial: "wall0", roads: "roads", platformer: "platformer" };

/** Train styles: front cab ("a" car, faces +z) + two middle cars. Pantographs are dropped. */
const TRAINS = {
  subway: ["train-electric-subway-a", "train-electric-subway-b", "train-electric-subway-c"],
  city: ["train-electric-city-a", "train-electric-city-c", "train-electric-city-b"],
  square: ["train-electric-square-a", "train-electric-square-b", "train-electric-square-c"],
  bullet: ["train-electric-bullet-a", "train-electric-bullet-b", "train-electric-bullet-c"],
};
const DROP_NODES = new Set(["collector"]);

const BUILDINGS = ["a", "b", "c", "d", "e", "f", "g", "h", "i", "k"];
const SKYSCRAPERS = ["a", "b", "c", "e"];
/** Street props: [name, pack, file, scale]. */
const PROPS = [
  ["lamp", "roads", "light-curved", CITY],
  ["cone", "roads", "construction-cone", CITY],
  ["jersey", "roads", "construction-barrier", CITY],
  ["dumpster", "roads", "dumpster", CITY],
  ["sign", "roads", "road-sign-warning", CITY],
  ["signal", "roads", "traffic-light", CITY],
  ["tree", "platformer", "tree", 2.8],
  ["pine", "platformer", "tree-pine", 3],
  ["hedge", "platformer", "hedge", 3],
];
const lum = (c) => (parseInt(c.slice(1, 3), 16) + parseInt(c.slice(3, 5), 16) + parseInt(c.slice(5, 7), 16)) / 765;
const POLY = {
  magnet: { file: "polypizza/magnet-dD2RIIea6WR.glb", size: 1.0, recolor: (c) => (c === "#ffffff" ? "#e9edf5" : c) },
  // Black trainer → Subway-Surfers-green super sneaker.
  sneakers: { file: "polypizza/trainer-cs7k_ENAZjQ.glb", size: 1.0, recolor: (c) => (lum(c) < 0.3 ? "#22d36b" : c) },
  // Grey/black photo texture → bright toy jetpack: light parts red, mid greys gold, darks navy.
  jetpack: {
    file: "polypizza/jetpack-a19dX3Vgo3S.glb",
    size: 1.0,
    // (`at` is the triangle centre in the model's own units; the two tanks sit at |x| > 2.6.)
    recolor: (c, at) => (lum(c) > 0.22 ? "#ffc52e" : Math.abs(at.x) > 2.6 ? "#ff4f3a" : "#2a3352"),
  },
};

// ── Small helpers ────────────────────────────────────────────────────────────

const tmp = mkdtempSync(path.join(tmpdir(), "br-env-"));
const kb = (n) => `${(n / 1024).toFixed(1)} KB`;

function unzip(pack, members) {
  const dir = path.join(tmp, pack);
  mkdirSync(dir, { recursive: true });
  const r = spawnSync("unzip", ["-o", "-q", path.join(RAW, PACKS[pack]), ...members, "-d", dir], { stdio: "inherit" });
  if (r.status !== 0) throw new Error(`unzip failed for ${pack}`);
  return dir;
}

function readGlb(file) {
  const b = readFileSync(file);
  if (b.readUInt32LE(0) !== 0x46546c67) throw new Error(`${file}: not a GLB`);
  const jsonLen = b.readUInt32LE(12);
  const json = JSON.parse(b.subarray(20, 20 + jsonLen).toString("utf8"));
  const off = 20 + jsonLen;
  const bin = off < b.length ? b.subarray(off + 8, off + 8 + b.readUInt32LE(off)) : Buffer.alloc(0);
  return { json, bin, file };
}

const COMP = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 };
const READ = {
  5120: ["getInt8", 1, 127], 5121: ["getUint8", 1, 255], 5122: ["getInt16", 2, 32767],
  5123: ["getUint16", 2, 65535], 5125: ["getUint32", 4, 0], 5126: ["getFloat32", 4, 0],
};

/** Reads an accessor into a plain Float32Array (or Uint32Array for indices). */
function accessor(g, index, asIndex = false) {
  const a = g.json.accessors[index];
  if (a.sparse) throw new Error(`${g.file}: sparse accessors unsupported`);
  const bv = g.json.bufferViews[a.bufferView];
  const n = COMP[a.type];
  const [fn, size, max] = READ[a.componentType];
  const stride = bv.byteStride || n * size;
  const base = (bv.byteOffset || 0) + (a.byteOffset || 0);
  const dv = new DataView(g.bin.buffer, g.bin.byteOffset, g.bin.byteLength);
  const out = asIndex ? new Uint32Array(a.count * n) : new Float32Array(a.count * n);
  for (let i = 0; i < a.count; i++) {
    for (let c = 0; c < n; c++) {
      let v = dv[fn](base + i * stride + c * size, true);
      if (a.normalized && max) v = Math.max(v / max, -1);
      out[i * n + c] = v;
    }
  }
  return out;
}

function nodeMatrix(n) {
  const m = new THREE.Matrix4();
  if (n.matrix) return m.fromArray(n.matrix);
  const t = new THREE.Vector3(...(n.translation ?? [0, 0, 0]));
  const r = new THREE.Quaternion(...(n.rotation ?? [0, 0, 0, 1]));
  const s = new THREE.Vector3(...(n.scale ?? [1, 1, 1]));
  return m.compose(t, r, s);
}

const linearToSrgb = (c) => (c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055);
const hex = (r, g, b) => "#" + [r, g, b].map((v) => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, "0")).join("");

// ── Flat colour swatches (solids tile: 16 × 16 cells of 16 px) ───────────────
const swatches = new Map();
function swatch(color) {
  const key = color.toLowerCase();
  let i = swatches.get(key);
  if (i === undefined) {
    i = swatches.size;
    if (i >= 256) throw new Error("out of swatches");
    swatches.set(key, i);
  }
  const [tx, ty] = TILE.solids;
  return [(tx + (i % 16) * 16 + 8) / ATLAS, (ty + Math.floor(i / 16) * 16 + 8) / ATLAS];
}
/** UV of a point inside a custom-tile region, u/v in 0..1 with v going DOWN the image. */
function regionUV(name, u, v) {
  const [rx, ry, rw, rh] = REGION[name];
  const [tx, ty] = TILE.custom;
  const inset = 1.5;
  return [
    (tx + rx + inset + u * (rw - 2 * inset)) / ATLAS,
    (ty + ry + inset + v * (rh - 2 * inset)) / ATLAS,
  ];
}

// ── Loading + baking source models ───────────────────────────────────────────

/** Texture pixels for embedded images (Poly Pizza), decoded once. */
async function embeddedImage(g, imageIndex) {
  const img = g.json.images[imageIndex];
  const bv = g.json.bufferViews[img.bufferView];
  const bytes = g.bin.subarray(bv.byteOffset || 0, (bv.byteOffset || 0) + bv.byteLength);
  const { data, info } = await sharp(bytes).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return { data, w: info.width, h: info.height };
}

/**
 * One source GLB → one BufferGeometry (position, normal, uv in atlas space), all node
 * transforms applied. Kenney palette UVs are remapped into the pack's atlas tile; untextured
 * materials become a flat swatch; embedded textures are sampled per triangle into swatches.
 */
async function bake(file, { tile, recolor = (c) => c, drop = DROP_NODES } = {}) {
  const g = readGlb(file);
  const parts = [];
  const visit = async (ni, parent) => {
    const n = g.json.nodes[ni];
    if (drop.has(n.name)) return;
    const world = parent.clone().multiply(nodeMatrix(n));
    if (n.mesh !== undefined) {
      for (const p of g.json.meshes[n.mesh].primitives) {
        if (p.mode !== undefined && p.mode !== 4) continue;
        let geo = new THREE.BufferGeometry();
        geo.setAttribute("position", new THREE.BufferAttribute(accessor(g, p.attributes.POSITION), 3));
        if (p.attributes.NORMAL !== undefined) geo.setAttribute("normal", new THREE.BufferAttribute(accessor(g, p.attributes.NORMAL), 3));
        if (p.attributes.TEXCOORD_0 !== undefined) geo.setAttribute("uv", new THREE.BufferAttribute(accessor(g, p.attributes.TEXCOORD_0), 2));
        if (p.indices !== undefined) geo.setIndex(new THREE.BufferAttribute(accessor(g, p.indices, true), 1));
        geo = geo.index ? geo.toNonIndexed() : geo;
        if (!geo.getAttribute("normal")) geo.computeVertexNormals();
        geo.applyMatrix4(world);
        // Mirrored node transforms flip the winding.
        if (world.determinant() < 0) flipWinding(geo);
        await paint(g, p, geo, tile, recolor);
        parts.push(geo);
      }
    }
    for (const c of n.children ?? []) await visit(c, world);
  };
  const scene = g.json.scenes[g.json.scene ?? 0];
  for (const ni of scene.nodes) await visit(ni, new THREE.Matrix4());
  return mergeGeometries(parts.map(clean));
}

function flipWinding(geo) {
  for (const name of ["position", "normal", "uv"]) {
    const a = geo.getAttribute(name);
    if (!a) continue;
    for (let i = 0; i < a.count; i += 3) {
      for (let c = 0; c < a.itemSize; c++) {
        const t = a.array[(i + 1) * a.itemSize + c];
        a.array[(i + 1) * a.itemSize + c] = a.array[(i + 2) * a.itemSize + c];
        a.array[(i + 2) * a.itemSize + c] = t;
      }
    }
  }
}

/** Keeps exactly position/normal/uv as non-indexed float attributes (mergeable). */
function clean(geo) {
  const out = new THREE.BufferGeometry();
  const g = geo.index ? geo.toNonIndexed() : geo;
  for (const name of ["position", "normal", "uv"]) {
    const a = g.getAttribute(name);
    out.setAttribute(name, new THREE.BufferAttribute(new Float32Array(a.array), a.itemSize));
  }
  return out;
}

const centre = new THREE.Vector3();

async function paint(g, prim, geo, tile, recolor) {
  const mat = prim.material !== undefined ? g.json.materials[prim.material] : {};
  const pbr = mat.pbrMetallicRoughness ?? {};
  const texIndex = pbr.baseColorTexture?.index;
  const n = geo.getAttribute("position").count;
  const uv = new Float32Array(n * 2);
  if (texIndex !== undefined && tile) {
    // Kenney palette: remap into the tile, clamped half a texel in from the edges.
    const src = geo.getAttribute("uv");
    const [tx, ty, ts] = TILE[tile];
    const lo = 0.5 / ts;
    let outside = 0;
    for (let i = 0; i < n; i++) {
      let u = src.getX(i);
      let v = src.getY(i);
      if (u < -0.001 || u > 1.001 || v < -0.001 || v > 1.001) outside++;
      u = Math.min(1 - lo, Math.max(lo, u - Math.floor(u === 1 ? 0 : u)));
      v = Math.min(1 - lo, Math.max(lo, v - Math.floor(v === 1 ? 0 : v)));
      uv[i * 2] = (tx + u * ts) / ATLAS;
      uv[i * 2 + 1] = (ty + v * ts) / ATLAS;
    }
    if (outside) console.warn(`  ! ${path.basename(g.file)}: ${outside} UVs outside 0..1 (wrapped)`);
  } else if (texIndex !== undefined) {
    // Embedded photo-ish texture: one flat colour per triangle (quantised), as swatches.
    const img = await embeddedImage(g, g.json.textures[texIndex].source);
    const src = geo.getAttribute("uv");
    for (let t = 0; t < n; t += 3) {
      let u = 0;
      let v = 0;
      for (let k = 0; k < 3; k++) {
        u += src.getX(t + k) / 3;
        v += src.getY(t + k) / 3;
      }
      u -= Math.floor(u);
      v -= Math.floor(v);
      const px = Math.min(img.w - 1, Math.floor(u * img.w));
      const py = Math.min(img.h - 1, Math.floor(v * img.h));
      const o = (py * img.w + px) * 4;
      const q = (c) => Math.round(img.data[o + c] / 32) * 32;
      let c = hex(q(0), q(1), q(2));
      const pos = geo.getAttribute("position");
      centre.set(0, 0, 0);
      for (let k = 0; k < 3; k++) centre.x += pos.getX(t + k) / 3;
      c = recolor(c, centre);
      const [su, sv] = swatch(c);
      for (let k = 0; k < 3; k++) {
        uv[(t + k) * 2] = su;
        uv[(t + k) * 2 + 1] = sv;
      }
    }
  } else {
    const f = pbr.baseColorFactor ?? [1, 1, 1, 1];
    let c = hex(linearToSrgb(f[0]) * 255, linearToSrgb(f[1]) * 255, linearToSrgb(f[2]) * 255);
    c = recolor(c, centre.set(0, 0, 0));
    const [su, sv] = swatch(c);
    for (let i = 0; i < n; i++) {
      uv[i * 2] = su;
      uv[i * 2 + 1] = sv;
    }
  }
  geo.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
}

const box3 = (geo) => {
  geo.computeBoundingBox();
  return geo.boundingBox;
};

/** Scales uniformly, feet at y = 0, centred on x/z. */
function normalise(geo, scale, { center = true } = {}) {
  geo.scale(scale, scale, scale);
  const b = box3(geo);
  geo.translate(center ? -(b.min.x + b.max.x) / 2 : 0, -b.min.y, center ? -(b.min.z + b.max.z) / 2 : 0);
  return geo;
}

// ── Train fitting ────────────────────────────────────────────────────────────

/** Half-width of a train body in metres after fitting (collision half-width is 1.05). */
const BODY_HALF = 1.0;
/** Nothing on a car may reach further out (lanes are 2.4 m apart). */
const MAX_HALF = 1.15;
const rc = new THREE.Raycaster();
const median = (a) => {
  const s = [...a].sort((p, q) => p - q);
  return s.length ? s[Math.floor(s.length / 2)] : NaN;
};
const meshOf = (geo) => new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }));

/** Median height of the first surface hit straight down near the centre line (feet at y = 0). */
function roofHeight(geo) {
  const b = box3(geo);
  const mesh = meshOf(geo);
  const w = b.max.x - b.min.x;
  const d = b.max.z - b.min.z;
  const hits = [];
  for (const fx of [-0.2, -0.1, 0, 0.1, 0.2]) {
    for (let k = 1; k < 20; k++) {
      rc.set(new THREE.Vector3(fx * w, b.max.y + 1, b.min.z + (d * k) / 20), new THREE.Vector3(0, -1, 0));
      const h = rc.intersectObject(mesh, false)[0];
      if (h) hits.push(h.point.y);
    }
  }
  return median(hits);
}

/** Median |x| of the body side, probed from both sides between 35 % and 80 % of the roof. */
function bodyHalfWidth(geo, roof) {
  const b = box3(geo);
  const mesh = meshOf(geo);
  const d = b.max.z - b.min.z;
  const hits = [];
  for (const fy of [0.35, 0.5, 0.65, 0.8]) {
    for (let k = 1; k < 20; k++) {
      for (const s of [-1, 1]) {
        rc.set(new THREE.Vector3(s * (b.max.x - b.min.x), fy * roof, b.min.z + (d * k) / 20), new THREE.Vector3(-s, 0, 0));
        const h = rc.intersectObject(mesh, false)[0];
        if (h) hits.push(Math.abs(h.point.x));
      }
    }
  }
  return median(hits);
}

/**
 * Pushes every vertex above `roof` just under it (roof clutter folds flat, hidden by the roof)
 * and every vertex wider than `half` back to it.
 */
function clampExtent(geo, roof, half) {
  const pos = geo.getAttribute("position");
  for (let i = 0; i < pos.count; i++) {
    if (pos.getY(i) > roof * 1.004) pos.setY(i, roof * 0.996);
    const x = pos.getX(i);
    if (Math.abs(x) > half) pos.setX(i, Math.sign(x) * half);
  }
  pos.needsUpdate = true;
  geo.computeBoundingBox();
}

// ── Authored meshes (obstacles + 2x badge), built from three primitives ──────

/** UVs of every vertex → one point. */
function flat(geo, uv) {
  const g = geo.index ? geo.toNonIndexed() : geo;
  const a = new Float32Array(g.getAttribute("position").count * 2);
  for (let i = 0; i < a.length; i += 2) {
    a[i] = uv[0];
    a[i + 1] = uv[1];
  }
  g.setAttribute("uv", new THREE.BufferAttribute(a, 2));
  return clean(g);
}

/**
 * A box whose ±z faces (and optionally ±x) show a custom region (stretched once across the
 * face); all other faces get `side`. `faces` lists BoxGeometry face indices that get the region.
 */
function stripedBox(w, h, d, region, side, faces = [4, 5]) {
  const geo = new THREE.BoxGeometry(w, h, d);
  const uv = geo.getAttribute("uv");
  for (let f = 0; f < 6; f++) {
    for (let k = 0; k < 4; k++) {
      const i = f * 4 + k;
      const [u, v] = faces.includes(f) ? regionUV(region, uv.getX(i), 1 - uv.getY(i)) : side;
      uv.setXY(i, u, v);
    }
  }
  return clean(geo);
}

const at = (geo, x, y, z) => geo.translate(x, y, z);

function jumpBarrier() {
  const dark = swatch("#3b4058");
  const white = swatch("#f4f4f8");
  const amber = swatch("#ffc23d");
  const parts = [];
  // Striped top plank + a plain lower rail between two posts.
  parts.push(at(stripedBox(BARRIER_W, 0.4, 0.12, "stripesRed", white), 0, JUMP_H - 0.22, -JUMP_LEN / 2));
  parts.push(at(flat(new THREE.BoxGeometry(BARRIER_W - 0.3, 0.12, 0.08), white), 0, 0.38, -JUMP_LEN / 2));
  for (const s of [-1, 1]) {
    parts.push(at(flat(new THREE.BoxGeometry(0.12, JUMP_H - 0.06, 0.12), dark), s * 0.82, (JUMP_H - 0.06) / 2, -JUMP_LEN / 2));
    parts.push(at(flat(new THREE.BoxGeometry(0.2, 0.08, JUMP_LEN), dark), s * 0.82, 0.04, -JUMP_LEN / 2));
    parts.push(at(flat(new THREE.CylinderGeometry(0.07, 0.07, 0.06, 10).rotateX(Math.PI / 2), amber), s * 0.82, JUMP_H - 0.22, -JUMP_LEN / 2 + 0.09));
    parts.push(at(flat(new THREE.CylinderGeometry(0.07, 0.07, 0.06, 10).rotateX(Math.PI / 2), amber), s * 0.82, JUMP_H - 0.22, -JUMP_LEN / 2 - 0.09));
  }
  return mergeGeometries(parts);
}

function rollBarrier() {
  const dark = swatch("#3b4058");
  const yellow = swatch("#ffcf33");
  const red = swatch("#ff3b30");
  const barH = ROLL_TOP - ROLL_BOTTOM;
  const parts = [];
  // Big striped panel exactly over the roll band, framed top and bottom.
  parts.push(at(stripedBox(BARRIER_W, barH - 0.12, 0.1, "stripesYellow", yellow), 0, ROLL_BOTTOM + barH / 2, -JUMP_LEN / 2));
  parts.push(at(flat(new THREE.BoxGeometry(BARRIER_W + 0.06, 0.06, 0.16), dark), 0, ROLL_BOTTOM + 0.03, -JUMP_LEN / 2));
  parts.push(at(flat(new THREE.BoxGeometry(BARRIER_W + 0.06, 0.06, 0.16), dark), 0, ROLL_TOP - 0.03, -JUMP_LEN / 2));
  for (const s of [-1, 1]) {
    const x = s * (BARRIER_W / 2 + 0.06);
    parts.push(at(flat(new THREE.BoxGeometry(0.12, ROLL_TOP + 0.1, 0.14), dark), x, (ROLL_TOP + 0.1) / 2, -JUMP_LEN / 2));
    parts.push(at(flat(new THREE.BoxGeometry(0.22, 0.08, 0.4), dark), x, 0.04, -JUMP_LEN / 2));
    parts.push(at(flat(new THREE.SphereGeometry(0.1, 12, 8), red), x, ROLL_TOP + 0.17, -JUMP_LEN / 2));
  }
  return mergeGeometries(parts);
}

function ramp() {
  const deck = swatch("#a3abbf");
  const frame = swatch("#525a73");
  const under = swatch("#6a7189");
  const tread = swatch("#ffcf33");
  const slope = Math.atan2(TRAIN_H, RAMP_LEN);
  const slopeLen = Math.hypot(TRAIN_H, RAMP_LEN);
  const parts = [];
  // Solid wedge (seen from the side), slightly narrower than the deck.
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.lineTo(RAMP_LEN, 0);
  shape.lineTo(RAMP_LEN, TRAIN_H - 0.1);
  shape.closePath();
  const wedge = new THREE.ExtrudeGeometry(shape, { depth: RAMP_W - 0.16, bevelEnabled: false });
  wedge.rotateY(Math.PI / 2).translate(-(RAMP_W - 0.16) / 2, 0, 0);
  parts.push(flat(wedge, under));
  // Deck plate whose top surface is exactly the gameplay slope (y = −z · H / L).
  const plate = new THREE.BoxGeometry(RAMP_W, 0.1, slopeLen);
  plate.translate(0, -0.05, -slopeLen / 2).rotateX(slope);
  parts.push(flat(plate, deck));
  // Side rails and grip treads (inside the deck's top 4 cm).
  for (const s of [-1, 1]) {
    const rail = new THREE.BoxGeometry(0.1, 0.16, slopeLen);
    rail.translate(s * (RAMP_W / 2 - 0.05), 0.02, -slopeLen / 2).rotateX(slope);
    parts.push(flat(rail, frame));
    const back = new THREE.BoxGeometry(0.14, TRAIN_H, 0.14);
    back.translate(s * (RAMP_W / 2 - 0.1), TRAIN_H / 2, -RAMP_LEN + 0.07);
    parts.push(flat(back, frame));
  }
  for (let i = 1; i < 12; i++) {
    const t = new THREE.BoxGeometry(RAMP_W - 0.3, 0.04, 0.14);
    t.translate(0, 0.0, -(i / 12) * slopeLen).rotateX(slope);
    parts.push(flat(t, tread));
  }
  // Hazard band where the ramp meets the track.
  const lip = stripedBox(RAMP_W, 0.04, 0.5, "stripesYellow", tread, [2]);
  lip.translate(0, 0.0, -0.3).rotateX(slope);
  parts.push(lip);
  return mergeGeometries(parts);
}

function badge2x() {
  const gold = swatch("#ffc52e");
  const disc = new THREE.CylinderGeometry(0.48, 0.48, 0.12, 40, 1);
  const uv = disc.getAttribute("uv");
  const pos = disc.getAttribute("position");
  // Groups: 0 side, 1 top cap, 2 bottom cap. Caps get the badge (planar mapping from x/z so
  // the text reads the right way round from the front), the rim is gold.
  for (const grp of disc.groups) {
    for (let k = grp.start; k < grp.start + grp.count; k++) {
      const i = disc.index.getX(k);
      if (grp.materialIndex === 0) uv.setXY(i, gold[0], gold[1]);
      else {
        const top = grp.materialIndex === 1;
        const u = pos.getX(i) / 0.96 + 0.5;
        const v = pos.getZ(i) / 0.96 + 0.5;
        const [a, b] = regionUV("badge2x", top ? u : 1 - u, v);
        uv.setXY(i, a, b);
      }
    }
  }
  // Caps face ±z after this (top cap → +z, toward the player).
  disc.rotateX(Math.PI / 2);
  return clean(disc);
}

// ── Atlas image ──────────────────────────────────────────────────────────────

async function rgba(file, size) {
  const { data } = await sharp(file).ensureAlpha().resize(size, size, { kernel: "nearest" }).raw().toBuffer({ resolveWithObject: true });
  return data;
}

/** "#rrggbb" → [r, g, b] bytes (sRGB, as painted). */
const bytes = (color) => [1, 3, 5].map((i) => parseInt(color.slice(i, i + 2), 16));

/** Recolours the commercial wall swatches (cells x 6–7, y 8–11 at 512 px) to `color`. */
function recolourWalls(data, size, color) {
  const [r, g, b] = bytes(color);
  const s = size / 512;
  for (let y = Math.floor(256 * s); y < Math.floor(384 * s); y++) {
    for (let x = Math.floor(192 * s); x < Math.floor(256 * s); x++) {
      const o = (y * size + x) * 4;
      // Keep the palette's shading gradient: the white swatch's own brightness scales the tint.
      const k = Math.min(1, (data[o] + data[o + 1] + data[o + 2]) / (3 * 255 * 0.97));
      data[o] = Math.round(r * k);
      data[o + 1] = Math.round(g * k);
      data[o + 2] = Math.round(b * k);
    }
  }
}

function customTileSvg() {
  const stripes = (y, h, a, b) => {
    let s = `<rect x="0" y="${y}" width="256" height="${h}" fill="${a}"/>`;
    for (let x = -h; x < 256 + h; x += 36) s += `<polygon points="${x},${y + h} ${x + 18},${y + h} ${x + 18 + h},${y} ${x + h},${y}" fill="${b}"/>`;
    return s;
  };
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256">
    <rect width="256" height="256" fill="#ffffff"/>
    ${stripes(0, 48, "#ffffff", "#e8403a")}
    ${stripes(48, 48, "#ffcf33", "#25283a")}
    <rect x="0" y="96" width="128" height="128" fill="#ffc52e"/>
    <circle cx="64" cy="160" r="60" fill="#ff3d8b"/>
    <circle cx="64" cy="160" r="52" fill="none" stroke="#ffffff" stroke-width="5"/>
    <text x="64" y="183" font-family="Arial Black, Arial, Helvetica, sans-serif" font-weight="900" font-size="62"
      text-anchor="middle" fill="#ffffff" stroke="#8a1446" stroke-width="3" paint-order="stroke">2x</text>
  </svg>`);
}

async function buildAtlas(dirs) {
  const com = path.join(dirs.commercial, "Models");
  const sources = {
    base: path.join(com, "GLB format", "Textures", "colormap.png"),
    "variation-a": path.join(com, "Textures", "variation-a.png"),
    "variation-b": path.join(com, "Textures", "variation-b.png"),
  };
  const layers = [];
  const put = (data, [x, y, s]) => layers.push({ input: data, raw: { width: s, height: s, channels: 4 }, left: x, top: y });
  put(await rgba(path.join(dirs.train, "Models", "GLB format", "Textures", "colormap.png"), 512), TILE.train);
  for (const w of WALLS) {
    const data = await rgba(sources[w.from], 256);
    if (w.wall) recolourWalls(data, 256, w.wall);
    put(data, TILE[w.tile]);
  }
  put(await rgba(path.join(dirs.roads, "Models", "GLB format", "Textures", "colormap.png"), 256), TILE.roads);
  put(await rgba(path.join(dirs.platformer, "Models", "GLB format", "Textures", "colormap.png"), 256), TILE.platformer);
  layers.push({ input: await sharp(customTileSvg()).png().toBuffer(), left: TILE.custom[0], top: TILE.custom[1] });
  // Flat swatches.
  const solids = Buffer.alloc(256 * 256 * 4, 255);
  for (const [color, i] of swatches) {
    const [r, g, b] = bytes(color);
    const cx = (i % 16) * 16;
    const cy = Math.floor(i / 16) * 16;
    for (let y = cy; y < cy + 16; y++) {
      for (let x = cx; x < cx + 16; x++) solids.set([r, g, b, 255], (y * 256 + x) * 4);
    }
  }
  put(solids, TILE.solids);
  return sharp({ create: { width: ATLAS, height: ATLAS, channels: 4, background: "#808080ff" } })
    .composite(layers)
    .removeAlpha()
    .png({ compressionLevel: 9, palette: false })
    .toBuffer();
}

// ── GLB writer (indexed float geometry, one material, named nodes) ──────────

function writeGlb(file, meshes, extras) {
  const json = {
    asset: { version: "2.0", generator: "brainrotsurfers-env-assets" },
    scene: 0,
    scenes: [{ name: "env", nodes: [], extras }],
    nodes: [],
    meshes: [],
    materials: [{ name: "env-atlas", pbrMetallicRoughness: { baseColorFactor: [1, 1, 1, 1], metallicFactor: 0, roughnessFactor: 1 } }],
    accessors: [],
    bufferViews: [],
    buffers: [{ byteLength: 0 }],
  };
  const chunks = [];
  let length = 0;
  const view = (arr, target) => {
    const pad = (4 - (length % 4)) % 4;
    if (pad) {
      chunks.push(Buffer.alloc(pad));
      length += pad;
    }
    json.bufferViews.push({ buffer: 0, byteOffset: length, byteLength: arr.byteLength, target });
    chunks.push(Buffer.from(arr.buffer, arr.byteOffset, arr.byteLength));
    length += arr.byteLength;
    return json.bufferViews.length - 1;
  };
  const acc = (arr, type, componentType, target, minmax) => {
    const n = COMP[type];
    const a = { bufferView: view(arr, target), componentType, count: arr.length / n, type };
    if (minmax) {
      a.min = Array(n).fill(Infinity);
      a.max = Array(n).fill(-Infinity);
      for (let i = 0; i < arr.length; i++) {
        a.min[i % n] = Math.min(a.min[i % n], arr[i]);
        a.max[i % n] = Math.max(a.max[i % n], arr[i]);
      }
    }
    json.accessors.push(a);
    return json.accessors.length - 1;
  };
  for (const { name, geo } of meshes) {
    const g = mergeVertices(geo, 1e-5);
    const pos = new Float32Array(g.getAttribute("position").array);
    const nor = new Float32Array(g.getAttribute("normal").array);
    const uv = new Float32Array(g.getAttribute("uv").array);
    const idx = g.index.array;
    const indices = pos.length / 3 > 65535 ? new Uint32Array(idx) : new Uint16Array(idx);
    const prim = {
      attributes: {
        POSITION: acc(pos, "VEC3", 5126, 34962, true),
        NORMAL: acc(nor, "VEC3", 5126, 34962),
        TEXCOORD_0: acc(uv, "VEC2", 5126, 34962),
      },
      indices: acc(indices, "SCALAR", indices instanceof Uint32Array ? 5125 : 5123, 34963),
      material: 0,
    };
    json.meshes.push({ name, primitives: [prim] });
    json.nodes.push({ name, mesh: json.meshes.length - 1 });
    json.scenes[0].nodes.push(json.nodes.length - 1);
  }
  const bin = Buffer.concat(chunks);
  const binPad = Buffer.alloc((4 - (bin.length % 4)) % 4);
  json.buffers[0].byteLength = bin.length + binPad.length;
  let jsonBuf = Buffer.from(JSON.stringify(json));
  jsonBuf = Buffer.concat([jsonBuf, Buffer.alloc((4 - (jsonBuf.length % 4)) % 4, 0x20)]);
  const header = Buffer.alloc(12);
  header.writeUInt32LE(0x46546c67, 0);
  header.writeUInt32LE(2, 4);
  header.writeUInt32LE(12 + 8 + jsonBuf.length + 8 + bin.length + binPad.length, 8);
  const jh = Buffer.alloc(8);
  jh.writeUInt32LE(jsonBuf.length, 0);
  jh.writeUInt32LE(0x4e4f534a, 4);
  const bh = Buffer.alloc(8);
  bh.writeUInt32LE(bin.length + binPad.length, 0);
  bh.writeUInt32LE(0x004e4942, 4);
  writeFileSync(file, Buffer.concat([header, jh, jsonBuf, bh, bin, binPad]));
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const glbPath = (pack, f) => `Models/GLB format/${f}.glb`;
  const want = {
    train: [...Object.values(TRAINS).flat().map((f) => glbPath("train", f)), "Models/GLB format/Textures/colormap.png"],
    commercial: [
      ...BUILDINGS.map((b) => glbPath("commercial", `building-${b}`)),
      ...SKYSCRAPERS.map((b) => glbPath("commercial", `building-skyscraper-${b}`)),
      "Models/GLB format/Textures/colormap.png",
      "Models/Textures/variation-a.png",
      "Models/Textures/variation-b.png",
    ],
    roads: [...PROPS.filter((p) => p[1] === "roads").map((p) => glbPath("roads", p[2])), "Models/GLB format/Textures/colormap.png"],
    platformer: [
      ...PROPS.filter((p) => p[1] === "platformer").map((p) => glbPath("platformer", p[2])),
      "Models/GLB format/Textures/colormap.png",
    ],
  };
  const dirs = {};
  for (const [pack, members] of Object.entries(want)) dirs[pack] = unzip(pack, members);
  const src = (pack, f) => path.join(dirs[pack], "Models", "GLB format", `${f}.glb`);

  const meshes = [];
  const add = (name, geo) => meshes.push({ name, geo });

  // Trains: x/y in metres, z normalised so each car spans exactly z ∈ [−0.5, 0.5] with its
  // front at +0.5. Sizes come from measuring the middle car (not its bounding box, which roof
  // vents and handrails inflate): centre-line roof → TRAIN_H, body side → BODY_HALF.
  for (const [style, files] of Object.entries(TRAINS)) {
    const cars = [];
    for (const f of files) {
      const geo = await bake(src("train", f), { tile: PACK_TILE.train });
      const b = box3(geo);
      geo.translate(-(b.min.x + b.max.x) / 2, -b.min.y, -(b.min.z + b.max.z) / 2);
      cars.push(geo);
    }
    const roof = roofHeight(cars[1]);
    const side = bodyHalfWidth(cars[1], roof);
    const sx = BODY_HALF / side;
    const sy = TRAIN_H / roof;
    // Anything above the roof (vents, horns) would poke through the runner's feet, and steps or
    // handrails sticking out past MAX_HALF would cut into the next lane's train: fold them in.
    for (const geo of cars) clampExtent(geo, roof, MAX_HALF / sx);
    cars.forEach((geo, i) => {
      const b = box3(geo);
      geo.scale(sx, sy, 1 / (b.max.z - b.min.z));
      add(`train-${style}-${["front", "mid1", "mid2"][i]}`, geo);
    });
    console.log(`  train ${style}: roof ${roof.toFixed(3)} → ${TRAIN_H}, side ${side.toFixed(3)} → ${(side * sx).toFixed(2)} m`);
  }

  for (const b of BUILDINGS) add(`bld-${b}`, normalise(await bake(src("commercial", `building-${b}`), { tile: PACK_TILE.commercial }), CITY));
  for (const b of SKYSCRAPERS) add(`sky-${b}`, normalise(await bake(src("commercial", `building-skyscraper-${b}`), { tile: PACK_TILE.commercial }), CITY));
  for (const [name, pack, file, scale] of PROPS) {
    // Street furniture keeps its own pivot on x/z (lamp arms reach out from the pole).
    const geo = await bake(src(pack, file), { tile: PACK_TILE[pack] });
    add(`prop-${name}`, normalise(geo, scale, { center: pack !== "roads" }));
  }

  // Pickups: centred, largest dimension = size.
  for (const [kind, def] of Object.entries(POLY)) {
    const geo = await bake(path.join(RAW, def.file), { recolor: def.recolor });
    const b = box3(geo);
    geo.translate(-(b.min.x + b.max.x) / 2, -(b.min.y + b.max.y) / 2, -(b.min.z + b.max.z) / 2);
    const s = def.size / Math.max(b.max.x - b.min.x, b.max.y - b.min.y, b.max.z - b.min.z);
    geo.scale(s, s, s);
    add(`pu-${kind}`, geo);
  }
  add("pu-multiplier", badge2x());

  add("obs-jump", jumpBarrier());
  add("obs-roll", rollBarrier());
  add("obs-ramp", ramp());

  // Building wall-colour tiles as UV offsets from the base tile.
  const [bx, by] = TILE.wall0;
  const wallOffsets = WALLS.map((w) => [(TILE[w.tile][0] - bx) / ATLAS, (TILE[w.tile][1] - by) / ATLAS]);

  mkdirSync(OUT, { recursive: true });
  const atlas = await buildAtlas(dirs);
  writeFileSync(path.join(OUT, "env-atlas.png"), atlas);

  const raw = path.join(tmp, "env-raw.glb");
  writeGlb(raw, meshes, { brEnv: { version: 1, wallOffsets } });
  const out = path.join(OUT, "env.glb");
  const r = spawnSync("npx", ["-y", GLTF_TRANSFORM, "meshopt", raw, out, "--level", "high"], { stdio: "inherit" });
  if (r.status !== 0) throw new Error("gltf-transform meshopt failed");

  let tris = 0;
  for (const m of meshes) {
    const t = m.geo.getAttribute("position").count / 3;
    tris += t;
    console.log(`  ${m.name.padEnd(22)} ${String(t).padStart(6)} tris`);
  }
  console.log(`meshes ${meshes.length}, tris ${tris}, swatches ${swatches.size}`);
  console.log(`raw ${kb(statSync(raw).size)} → env.glb ${kb(statSync(out).size)}, env-atlas.png ${kb(atlas.length)}`);
}

try {
  await main();
} finally {
  rmSync(tmp, { recursive: true, force: true });
}
