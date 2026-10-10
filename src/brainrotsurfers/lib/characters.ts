import { asset } from "./routes";

/**
 * Character registry: the 9 playables (shop order = price order) plus the chaser cat.
 * Models come from different Sketchfab authors, so each entry carries its own normalisation
 * (target height, facing, offsets), a few load-time fixes (pose, morphs, tints) and a motion
 * style — game/models.ts and game/anim.ts apply them. When a GLB is missing or fails to load,
 * the game falls back to a procedural placeholder in `accent`.
 *
 * Every raw model faces +z (the glTF convention); the runner runs toward −z, hence the π turns.
 * The optimised GLBs are built by scripts/brainrotsurfers-assets.mjs.
 */

export interface ModelCredit {
  title: string;
  author: string;
  url: string;
  license: string;
  licenseUrl: string;
  /** What we changed (CC BY asks for it) and any upstream credit; shown on the credits screen. */
  detail?: string;
}

/** Per-character tweaks to the procedural animation (all optional; see game/anim.ts). */
export interface MotionStyle {
  /** Hop height while running, metres (default 0.16; clip runners default 0.04). */
  hop?: number;
  /** Step frequency multiplier (default 1). */
  cadence?: number;
  /** Forward lean while running, radians (default 0.14). */
  lean?: number;
  /** Squash & stretch amount per step (default 0.12). */
  squash?: number;
  /** Side-to-side roll per step, radians (default 0.06): the waddle. */
  sway?: number;
  /** Yaw wiggle per step, radians (default 0): sharks swim. */
  swim?: number;
  /** Lane-change lean multiplier (default 1); flyers bank harder. */
  bank?: number;
  /** Pirouette (one full turn) on every jump. */
  spinJump?: boolean;
  /** Run-clip time scale at the start speed (15 m/s); grows sub-linearly with speed. */
  clipSpeed?: number;
}

/** A bone rotation applied once at load, in the raw model's space (radians, XYZ order). */
export interface BonePose {
  /** Bone name; the exporter's numeric suffix may be left off ("DEF-upper_armL"). */
  bone: string;
  rotate: [number, number, number];
}

export interface MaterialTint {
  multiply?: [number, number, number];
  /** Flat emissive colour added on top (raises near-black texels). */
  lift?: string;
  /** Overrides roughness (a glossy texture otherwise reads as polished metal under the sun). */
  roughness?: number;
}

export interface CharacterDef {
  /** Slug, e.g. "tung-tung-tung-sahur". */
  id: string;
  name: string;
  /** 0 = owned by default. */
  price: number;
  /** asset("/models/<id>.glb") */
  model: string;
  /** Target visual height in metres (default 1.75). */
  height?: number;
  /** Caps the visual width (x, metres) for wide models — wings, katanas — before `height`. */
  maxWidth?: number;
  /** Radians that make the model face −z (the run direction). */
  rotationY?: number;
  yOffset?: number;
  scale?: number;
  /** Clip names when the GLB ships usable animations. Unmapped clips never play. */
  clips?: { run?: string; idle?: string; jump?: string; roll?: string; caught?: string };
  /** Bone that carries the clip's root motion: its x/z translation is dropped so it stays put. */
  lockRoot?: string;
  /** Static re-posing at load (e.g. T-pose arms down). */
  pose?: BonePose[];
  /** Morph target influences set at load (index → weight). */
  morphs?: number[];
  /** Per material name: colour multiplier (components > 1 brighten) and an emissive lift for blacks. */
  tint?: Record<string, MaterialTint>;
  /** Floats instead of hopping while running (Bombardiro). */
  hover?: boolean;
  motion?: MotionStyle;
  /** UI accent colour (shop card, banners) and placeholder body colour. */
  accent: string;
  tagline: string;
  credit: ModelCredit;
}

const CC_BY_4 = { license: "CC BY 4.0", licenseUrl: "https://creativecommons.org/licenses/by/4.0/" };
const CC_BY_NC_4 = { license: "CC BY-NC 4.0", licenseUrl: "https://creativecommons.org/licenses/by-nc/4.0/" };
/** Every model went through the same web pass (scripts/brainrotsurfers-assets.mjs). */
const OPTIMISED = "Optimised for the web (compressed mesh, 512 px WebP textures), resized and animated in code";

const model = (id: string) => asset(`/models/${id}.glb`);
const TURN = Math.PI;

export const DEFAULT_CHARACTER_ID = "tung-tung-tung-sahur";

export const CHARACTERS: readonly CharacterDef[] = [
  {
    id: "tung-tung-tung-sahur",
    name: "Tung Tung Tung Sahur",
    price: 0,
    model: model("tung-tung-tung-sahur"),
    height: 1.8,
    rotationY: TURN,
    // Its only clip is a walk with the bat held out front; sped up it reads as a scurry.
    clips: { run: "Armature|Walk" },
    lockRoot: "mixamorigHips",
    motion: { clipSpeed: 3.4, hop: 0.07, squash: 0.08 },
    accent: "#c98a4b",
    tagline: "Bonks first, asks questions at sahur.",
    credit: {
      title: "Tung Sahur Game 3D model (Roblox)",
      author: "Alex CGW (alex.cgwarrior)",
      url: "https://sketchfab.com/3d-models/tung-sahur-game-3d-model-roblox-4cb52341b3bb4a59bd951e4e6b0ae0e6",
      ...CC_BY_4,
      detail: `${OPTIMISED}.`,
    },
  },
  {
    id: "tralalero-tralala",
    name: "Tralalero Tralala",
    price: 400,
    model: model("tralalero-tralala"),
    // A long shark: shorter than the bipeds so its 2.6 m body doesn't swallow the lane.
    height: 1.35,
    rotationY: TURN,
    motion: { hop: 0.1, cadence: 1.15, lean: 0.06, squash: 0.08, sway: 0.03, swim: 0.16 },
    accent: "#3fa9f5",
    tagline: "A shark in Nikes. Obviously fast.",
    credit: {
      title: "Tralalero Tralala",
      author: "Eks.Art",
      url: "https://sketchfab.com/3d-models/tralalero-tralala-091fffbf2972484f9c35c8a2ec8916f3",
      ...CC_BY_4,
      detail: `${OPTIMISED}; mesh simplified.`,
    },
  },
  {
    id: "lirili-larila",
    name: "Lirili Larila",
    price: 650,
    model: model("lirili-larila"),
    height: 1.7,
    rotationY: TURN,
    motion: { hop: 0.08, cadence: 0.8, lean: 0.08, squash: 0.06, sway: 0.16 },
    accent: "#7cc95a",
    tagline: "Cactus elephant. Carries a clock. Never late.",
    credit: {
      title: "Liri lira lira (Cactus_Elephant_Steps)",
      author: "XONNIC (xonnic)",
      url: "https://sketchfab.com/3d-models/liri-lira-lira-cactus-elephant-steps-3d38fe519d1347629c37e70006cfe7b7",
      ...CC_BY_4,
      detail: `${OPTIMISED}.`,
    },
  },
  {
    id: "chimpanzini-bananini",
    name: "Chimpanzini Bananini",
    price: 900,
    model: model("chimpanzini-bananini"),
    height: 1.6,
    rotationY: TURN,
    // No legs: its "walk" clip is a springy banana hop, which is exactly a run.
    clips: { run: "chimpanzini|walk", caught: "chimpanzini|death" },
    motion: { clipSpeed: 1.5, hop: 0.03, squash: 0.05, lean: 0.1 },
    accent: "#ffd23f",
    tagline: "Half chimp, half banana, fully peeled for speed.",
    credit: {
      title: "Chimpanzini Bananini",
      author: "shtran",
      url: "https://sketchfab.com/3d-models/chimpanzini-bananini-215481cabaa9435ba6c2ef06979e8dd9",
      ...CC_BY_4,
      detail: `${OPTIMISED}.`,
    },
  },
  {
    id: "brr-brr-patapim",
    name: "Brr Brr Patapim",
    price: 1300,
    model: model("brr-brr-patapim"),
    height: 1.85,
    rotationY: TURN,
    // The file's only clip is the T-pose itself; the rest pose already has the arms down.
    motion: { hop: 0.2, cadence: 0.78, lean: 0.12, squash: 0.18, sway: 0.08 },
    accent: "#5fae4e",
    tagline: "Big feet, bigger stomps.",
    credit: {
      title: "Brr Brr Patapim T Pose",
      author: "3D by Renato (3dbyrenato)",
      url: "https://sketchfab.com/3d-models/brr-brr-patapim-t-pose-8232aacf743042a3b95b689a752b9c73",
      ...CC_BY_4,
      detail: `Original mesh by Eks.Art (sketchfab.com/3d-models/brr-brr-patapim-2799fd1061e54acf8e5b2bdcdb0547df). ${OPTIMISED}; mesh simplified, shown in its arms-down rest pose.`,
    },
  },
  {
    id: "cappuccino-assassino",
    name: "Cappuccino Assassino",
    price: 1900,
    model: model("cappuccino-assassino"),
    height: 1.6,
    // The katanas stick out sideways; keep the blades inside ~2 m so dodges still read.
    maxWidth: 2.05,
    rotationY: TURN,
    motion: { hop: 0.14, cadence: 1.2, lean: 0.26, squash: 0.1, sway: 0.05 },
    accent: "#6b3f2a",
    tagline: "Silent, deadly, extra foam.",
    credit: {
      title: "Capuchino Assasino 3D model FREE",
      author: "Alex CGW (alex.cgwarrior)",
      url: "https://sketchfab.com/3d-models/capuchino-assasino-3d-model-free-77337e8ccd8644be9d6652fa6262998e",
      ...CC_BY_NC_4,
      detail: `${OPTIMISED}; mesh simplified. Non-commercial licence: this game is free.`,
    },
  },
  {
    id: "ballerina-cappuccina",
    name: "Ballerina Cappuccina",
    price: 2700,
    model: model("ballerina-cappuccina"),
    height: 1.85,
    rotationY: TURN,
    // Rigged in a T-pose and its one clip is a held arabesque, so the arms are lowered in code
    // (Rigify deform bones; raw model space, left arm along +x).
    pose: [
      { bone: "DEF-upper_armL", rotate: [0, 0, -1.15] },
      { bone: "DEF-upper_armR", rotate: [0, 0, 1.15] },
    ],
    tint: { Body: { multiply: [1.35, 0.7, 1.05], roughness: 0.85 } },
    motion: { hop: 0.12, cadence: 1.05, lean: 0.06, squash: 0.06, sway: 0.03, spinJump: true },
    accent: "#ff8fc7",
    tagline: "Pirouettes past trains, never spills a drop.",
    credit: {
      title: "Balerina Capuchino Rigged game ready model FREE",
      author: "Alex CGW (alex.cgwarrior)",
      url: "https://sketchfab.com/3d-models/balerina-capuchino-rigged-game-ready-model-free-b825fe788ea34264b6fae18903162a05",
      ...CC_BY_4,
      detail: `${OPTIMISED}; arms reposed, tutu tinted pinker.`,
    },
  },
  {
    id: "bobrito-bandito",
    name: "Bobrito Bandito",
    price: 3800,
    model: model("bobrito-bandito"),
    height: 1.75,
    rotationY: TURN,
    // Its Mixamo clip is a 10 s head-down fidget that hides the face under the hat: unused.
    tint: { Costume: { multiply: [1.5, 1.45, 1.4], lift: "#1d1a22" }, Bober: { multiply: [1.15, 1.1, 1.05] } },
    motion: { hop: 0.14, cadence: 0.95, lean: 0.16, squash: 0.1, sway: 0.07 },
    accent: "#8a5a3b",
    tagline: "Steals coins. And your heart.",
    credit: {
      title: "Bobrito Bandito Game ready 3D model FREE",
      author: "Alex CGW (alex.cgwarrior)",
      url: "https://sketchfab.com/3d-models/bobrito-bandito-game-ready-3d-model-free-6a670d8b8f004465bb36791e4492efd2",
      ...CC_BY_4,
      detail: `${OPTIMISED}; suit brightened.`,
    },
  },
  {
    id: "bombardiro-crocodilo",
    name: "Bombardiro Crocodilo",
    price: 5200,
    model: model("bombardiro-crocodilo"),
    height: 1,
    // Nose points −x in the file. The wingspan sets the scale: it must not cover 3 lanes.
    rotationY: -Math.PI / 2,
    maxWidth: 2.2,
    hover: true,
    motion: { lean: 0.06, bank: 2.2 },
    accent: "#4f7a3a",
    tagline: "A crocodile bomber. Doesn't run, hovers.",
    credit: {
      title: "BOMBARDIRO CROCODILO",
      author: "Aizen (Aizenx.)",
      url: "https://sketchfab.com/3d-models/bombardiro-crocodilo-db92444b3c064933a6f8ae31b0c27810",
      ...CC_BY_4,
      detail: `${OPTIMISED}.`,
    },
  },
];

/**
 * The OIIA OIIA spinning cat — the chaser. Not purchasable. Its morph target is the round
 * "loaf" from the meme; the file's spin clip is not played (chaser.ts spins it procedurally).
 */
export const CHASER: CharacterDef = {
  id: "oiia-cat",
  name: "OIIA Cat",
  price: -1,
  model: model("oiia-cat"),
  // A loaf, not a biped: kept smaller than the runners so it never hides them from the camera.
  height: 1.1,
  rotationY: TURN,
  morphs: [1],
  accent: "#a7a7ad",
  tagline: "OIIA OIIA.",
  credit: {
    title: "Oiiaioooooiai Cat",
    author: "Zhuier",
    url: "https://sketchfab.com/3d-models/oiiaioooooiai-cat-30d27bf7fb224849b76e208a6eccdb36",
    ...CC_BY_4,
    detail: `${OPTIMISED}.`,
  },
};

const byId = new Map(CHARACTERS.map((c) => [c.id, c]));

export function getCharacter(id: string): CharacterDef {
  return byId.get(id) ?? byId.get(DEFAULT_CHARACTER_ID)!;
}

export function isCharacterId(id: unknown): id is string {
  return typeof id === "string" && byId.has(id);
}
