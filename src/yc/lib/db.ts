import Database from "better-sqlite3";
import path from "node:path";

// The packed, read-only dataset lives at <repo>/data/yc.db (built by scripts/pack-web-db.ts in
// the YC pipeline repo). Rollback-journal mode, no WAL: Vercel's filesystem is read-only.
const DB_PATH = process.env.YC_DB_PATH ?? path.join(process.cwd(), "data", "yc.db");

declare global {
  var __ycDb: Database.Database | undefined;
}

export function db(): Database.Database {
  if (!globalThis.__ycDb) {
    const d = new Database(DB_PATH, { readonly: true, fileMustExist: true });
    // Facet counting materialises TEMP tables; keep them in memory so nothing touches disk.
    d.pragma("temp_store = MEMORY");
    globalThis.__ycDb = d;
  }
  return globalThis.__ycDb;
}
