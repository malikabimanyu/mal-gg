/**
 * Brainrot Surfers lives under mal.gg/brainrotsurfers. Every model, audio file and image goes
 * through `asset()` so the prefix is defined once.
 */
export const BASE = "/brainrotsurfers";

/** A file under public/brainrotsurfers, e.g. asset("/models/tung-tung-tung-sahur.glb"). */
export const asset = (path: string) => `${BASE}${path}`;
