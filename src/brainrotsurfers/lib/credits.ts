/**
 * Third-party credits that aren't characters (those live on each `CharacterDef.credit` in
 * characters.ts). CC BY requires naming the author, linking the licence and saying what we
 * changed, so every group carries a `note` about how the files were adapted for the web.
 * The credits screen renders these lists as-is; keep them in sync with what actually ships.
 */

export interface Credit {
  title: string;
  author: string;
  /** Where the asset was downloaded from. */
  url: string;
  license: string;
  licenseUrl: string;
  /** Extra line, e.g. which files were used or what was changed. */
  detail?: string;
}

export const LICENSES = {
  cc0: { license: "CC0 1.0", licenseUrl: "https://creativecommons.org/publicdomain/zero/1.0/" },
  ccBy3: { license: "CC BY 3.0", licenseUrl: "https://creativecommons.org/licenses/by/3.0/" },
  ccBy4: { license: "CC BY 4.0", licenseUrl: "https://creativecommons.org/licenses/by/4.0/" },
  ccByNc4: { license: "CC BY-NC 4.0", licenseUrl: "https://creativecommons.org/licenses/by-nc/4.0/" },
  ofl: { license: "SIL Open Font License 1.1", licenseUrl: "https://openfontlicense.org/open-font-license-official-text/" },
} as const;

export const CHARACTER_NOTE =
  "Models optimised and resized for the web (meshes simplified, textures compressed); some are recoloured or reposed and animated in code.";

export const ENVIRONMENT_NOTE = "Models optimised for the web: merged into one file, retextured with a shared colour atlas, rescaled to the game's obstacle sizes and recoloured where noted.";

export const AUDIO_NOTE = "Sounds trimmed, mixed and re-encoded as MP3 for the web. Extra SFX and the cat's “OIIA” are synthesised live in your browser.";

export const ENVIRONMENT_CREDITS: readonly Credit[] = [
  { title: "Train Kit", author: "Kenney", url: "https://kenney.nl/assets/train-kit", ...LICENSES.cc0 },
  { title: "City Kit (Commercial)", author: "Kenney", url: "https://kenney.nl/assets/city-kit-commercial", ...LICENSES.cc0 },
  { title: "City Kit (Roads)", author: "Kenney", url: "https://kenney.nl/assets/city-kit-roads", ...LICENSES.cc0 },
  { title: "Platformer Kit", author: "Kenney", url: "https://kenney.nl/assets/platformer-kit", ...LICENSES.cc0 },
  // Poly Pizza (CC BY 3.0): the three power-up pickups baked into env.glb.
  { title: "Magnet", author: "Poly by Google", url: "https://poly.pizza/m/dD2RIIea6WR", ...LICENSES.ccBy3, detail: "Magnet pickup; optimised and recoloured." },
  { title: "Trainer", author: "jeremy", url: "https://poly.pizza/m/cs7k_ENAZjQ", ...LICENSES.ccBy3, detail: "Super Sneakers pickup; optimised and recoloured green." },
  {
    title: "Jetpack",
    author: "Poly by Google",
    url: "https://poly.pizza/m/a19dX3Vgo3S",
    ...LICENSES.ccBy3,
    detail: "Jetpack pickup; optimised, texture flattened to plain colours, recoloured red and gold.",
  },
];

export const AUDIO_CREDITS: readonly Credit[] = [
  { title: "Fever Stadium (music)", author: "MintoDog", url: "https://opengameart.org/content/fever-stadium", ...LICENSES.cc0 },
  { title: "Swishes Sound Pack", author: "artisticdude", url: "https://opengameart.org/content/swishes-sound-pack", ...LICENSES.cc0 },
  { title: "Digital Audio", author: "Kenney", url: "https://kenney.nl/assets/digital-audio", ...LICENSES.cc0 },
  { title: "Interface Sounds", author: "Kenney", url: "https://kenney.nl/assets/interface-sounds", ...LICENSES.cc0 },
  { title: "Impact Sounds", author: "Kenney", url: "https://kenney.nl/assets/impact-sounds", ...LICENSES.cc0 },
  { title: "Music Jingles", author: "Kenney", url: "https://kenney.nl/assets/music-jingles", ...LICENSES.cc0 },
];

export const FONT_CREDITS: readonly Credit[] = [
  { title: "Lilita One", author: "Juan Montoreano", url: "https://fonts.google.com/specimen/Lilita+One", ...LICENSES.ofl },
];

export const MADE_BY = "Brainrot Surfers by Mal · free forever, no ads";
