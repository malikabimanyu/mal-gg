#!/usr/bin/env node
/**
 * Brainrot Surfers — turn the raw Sketchfab character GLBs into web-sized models.
 *
 *   node scripts/brainrotsurfers-assets.mjs                 # every character + the cat
 *   node scripts/brainrotsurfers-assets.mjs tralalero-tralala oiia-cat   # just these ids
 *
 * Reads the raw downloads from "SUBWAY SURVERS KW/" (gitignored, see the credits in
 * src/brainrotsurfers/lib/characters.ts) and writes one optimised file per character:
 *   public/brainrotsurfers/models/<id>.glb
 *
 * Every model goes through `gltf-transform optimize` (pinned 4.5.1, fetched by npx): meshopt
 * geometry + animation compression, WebP textures capped at 512 px, unused vertex attributes
 * (the extra UV sets Sketchfab exports) pruned, keyframes resampled. Skins are kept; of the
 * clips only `keep` survives (the ones characters.ts maps — the rest is dead weight: Bobrito's
 * 10 s Mixamo fidget alone was ~20 % of its file). Clips are dropped from the raw GLB's JSON
 * before optimizing, whose prune step then removes their now-unused keyframe data. Heavy sculpts are simplified to ~15–20k triangles; the small hand-made
 * rigs are left alone because simplifying skinned low-poly meshes tears them at the joints.
 * Palettes are off so every material keeps its name (the game tints some by name).
 */
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const GLTF_TRANSFORM = "@gltf-transform/cli@4.5.1";

/**
 * id → raw file + how hard to simplify. `ratio` is the fraction of vertices to keep and `error`
 * the allowed deviation (fraction of mesh extent); simplification stops at whichever comes first.
 */
const MODELS = [
  { id: "tung-tung-tung-sahur", raw: "tung_sahur_game_3d_model_roblox.glb", keep: ["Armature|Walk"] },
  { id: "tralalero-tralala", raw: "tralalero_tralala.glb", simplify: { ratio: 0.4, error: 0.004 } },
  { id: "brr-brr-patapim", raw: "brr_brr_patapim_t_pose.glb", simplify: { ratio: 0.2, error: 0.01 } },
  { id: "bombardiro-crocodilo", raw: "bombardiro_crocodilo.glb" },
  { id: "lirili-larila", raw: "liri_lira_lira_cactus_elephant_steps.glb" },
  { id: "ballerina-cappuccina", raw: "balerina_capuchino_rigged_game_ready_model_free.glb" },
  { id: "cappuccino-assassino", raw: "capuchino_assasino_3d_model_free.glb", simplify: { ratio: 0.45, error: 0.004 } },
  { id: "chimpanzini-bananini", raw: "chimpanzini_bananini.glb", keep: ["chimpanzini|walk", "chimpanzini|death"] },
  { id: "bobrito-bandito", raw: "bobrito_bandito_game_ready_3d_model_free.glb" },
  { id: "oiia-cat", raw: "oiiaioooooiai_cat.glb" },
];

/**
 * Copy of a GLB with only the animations named in `keep` (by name; [] drops all). Only the JSON
 * chunk changes; the orphaned keyframe accessors are pruned by `optimize`. Returns the number
 * of clips dropped.
 */
function keepClips(src, out, keep) {
  const b = readFileSync(src);
  if (b.readUInt32LE(0) !== 0x46546c67) throw new Error(`${src}: not a GLB`);
  const jsonLen = b.readUInt32LE(12);
  const json = JSON.parse(b.subarray(20, 20 + jsonLen).toString("utf8"));
  const before = json.animations?.length ?? 0;
  const kept = (json.animations ?? []).filter((a) => keep.includes(a.name));
  if (kept.length) json.animations = kept;
  else delete json.animations;
  let text = Buffer.from(JSON.stringify(json));
  text = Buffer.concat([text, Buffer.alloc((4 - (text.length % 4)) % 4, 0x20)]);
  const rest = b.subarray(20 + jsonLen);
  const head = Buffer.alloc(20);
  head.writeUInt32LE(0x46546c67, 0);
  head.writeUInt32LE(2, 4);
  head.writeUInt32LE(20 + text.length + rest.length, 8);
  head.writeUInt32LE(text.length, 12);
  head.writeUInt32LE(0x4e4f534a, 16);
  writeFileSync(out, Buffer.concat([head, text, rest]));
  return before - kept.length;
}

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const rawDir = path.join(root, "SUBWAY SURVERS KW");
const outDir = path.join(root, "public/brainrotsurfers/models");
mkdirSync(outDir, { recursive: true });

const only = process.argv.slice(2);
const unknown = only.filter((id) => !MODELS.some((m) => m.id === id));
if (unknown.length) {
  console.error(`unknown id(s): ${unknown.join(", ")}\nknown: ${MODELS.map((m) => m.id).join(", ")}`);
  process.exit(1);
}

const kb = (file) => `${Math.round(statSync(file).size / 1024)} KB`;
let failed = 0;
const tmp = mkdtempSync(path.join(tmpdir(), "br-chars-"));

for (const m of MODELS) {
  if (only.length && !only.includes(m.id)) continue;
  const src = path.join(rawDir, m.raw);
  const out = path.join(outDir, `${m.id}.glb`);
  if (!existsSync(src)) {
    console.error(`${m.id}: missing ${path.relative(root, src)}`);
    failed++;
    continue;
  }
  const trimmed = path.join(tmp, `${m.id}.glb`);
  const dropped = keepClips(src, trimmed, m.keep ?? []);
  const simplify = m.simplify
    ? ["--simplify-ratio", String(m.simplify.ratio), "--simplify-error", String(m.simplify.error)]
    : ["--simplify", "false"];
  const args = [
    "-y", GLTF_TRANSFORM, "optimize", trimmed, out,
    "--compress", "meshopt",
    "--texture-compress", "webp",
    "--texture-size", "512",
    "--palette", "false",
    ...simplify,
  ];
  const r = spawnSync("npx", args, { stdio: ["ignore", "ignore", "pipe"] });
  if (r.status !== 0) {
    console.error(`${m.id}: gltf-transform failed\n${r.stderr.toString().slice(-2000)}`);
    failed++;
    continue;
  }
  console.log(`${m.id}: ${kb(src)} → ${kb(out)}  public/brainrotsurfers/models/${m.id}.glb${dropped ? ` (${dropped} unused clip${dropped > 1 ? "s" : ""} dropped)` : ""}`);
}

rmSync(tmp, { recursive: true, force: true });
process.exit(failed ? 1 : 0);
