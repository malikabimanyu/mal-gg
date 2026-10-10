import { DEFAULT_CHARACTER_ID, isCharacterId } from "./characters";

/**
 * Local persistence. One versioned key; every access is wrapped in try/catch because storage
 * can be blocked (private mode, disabled cookies) and the game must still run on defaults.
 */

export const SAVE_KEY = "brainrotsurfers:v1";

export interface SaveData {
  coins: number;
  best: number;
  owned: string[];
  selected: string;
  muted: boolean;
  musicMuted: boolean;
  seenTutorial: boolean;
}

export function defaultSave(): SaveData {
  return {
    coins: 0,
    best: 0,
    owned: [DEFAULT_CHARACTER_ID],
    selected: DEFAULT_CHARACTER_ID,
    muted: false,
    musicMuted: false,
    seenTutorial: false,
  };
}

const count = (v: unknown) => (typeof v === "number" && Number.isFinite(v) && v >= 0 ? Math.floor(v) : 0);

/** Drops unknown ids, keeps the default character owned, falls back field by field. */
export function sanitizeSave(raw: unknown): SaveData {
  const d = defaultSave();
  if (!raw || typeof raw !== "object") return d;
  const r = raw as Record<string, unknown>;
  const owned = Array.isArray(r.owned) ? r.owned.filter(isCharacterId) : [];
  if (!owned.includes(DEFAULT_CHARACTER_ID)) owned.unshift(DEFAULT_CHARACTER_ID);
  const unique = [...new Set(owned)];
  const selected = isCharacterId(r.selected) && unique.includes(r.selected) ? r.selected : DEFAULT_CHARACTER_ID;
  return {
    coins: count(r.coins),
    best: count(r.best),
    owned: unique,
    selected,
    muted: r.muted === true,
    musicMuted: r.musicMuted === true,
    seenTutorial: r.seenTutorial === true,
  };
}

export function loadSave(): SaveData {
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    return raw ? sanitizeSave(JSON.parse(raw)) : defaultSave();
  } catch {
    return defaultSave();
  }
}

/** The stored save, or null when nothing is stored or storage is unreadable (keep in-memory state then). */
export function peekSave(): SaveData | null {
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    return raw ? sanitizeSave(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

export function writeSave(data: SaveData): void {
  try {
    window.localStorage.setItem(SAVE_KEY, JSON.stringify(data));
  } catch {
    // Storage unavailable: progress lives for this session only.
  }
}
