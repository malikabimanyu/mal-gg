@AGENTS.md

# Bretford dashboard (`/bretford/library`)

Sub-app hasil slicing Figma "TWITTER", hidup di route `src/app/bretford/library/` dengan kode di `src/bretford/` dan aset di `public/bretford/`. Token, primitives, dan konvensinya sengaja dipisah dari site utama:

- Token Bretford ada di bagian "Bretford" `src/app/globals.css` (`text-loud`, `text-normal`, `bg-base`, `shadow-card`, `rounded-card`, dst.) — jangan dipakai di halaman mal.gg, dan token site (`ink`, `page`, `card`, …) jangan dipakai di Bretford. Font: `font-bretford` (Geist, di-load di `src/app/bretford/library/layout.tsx`); site tetap Inter.
- Primitives: `src/bretford/components/ui/` — `Button` (md 32px / lg 44px), `Chip`/`StatusBadge`/`Tag`, `Avatar`, `Field`, `Select` (APG select-only combobox, menu di-portal), `Toast`, `Icon` (SVG di `public/bretford/icons`, via `asset()` di `src/bretford/lib/asset.ts`). Reuse, jangan duplikasi.
- Konten data-driven: `src/bretford/lib/library-data.ts` dan `sources-data.ts` (tambah slug di `sourceSlugs` + entry = halaman baru). Link internal lewat `src/bretford/lib/routes.ts`.
- Motion: `src/bretford/components/motion/page-motion.tsx` membungkus tiap page; target entrance = atribut `data-motion` (disembunyikan sampai dianimasikan), `data-count` count-up, `data-lift`/`data-nudge` hover. anime.js v4 named imports.
- Pembatas section pakai utility `rule-b`/`rule-r` (hairline inset) — stroke Figma ada di dalam, jadi tinggi bar tetap presisi. Dialog: native `<dialog>` + `showModal()` dengan overlay blur di dalamnya (`invite-modal.tsx`); dengarkan event `close` native juga.
- Gotcha stacking: `drop-shadow` (CSS filter) dan sisa inline `transform` dari anime.js bikin stacking context — apa pun yang harus mengambang di atas sibling (menu, popover) di-portal, dan grup yang dianimasikan membersihkan inline style-nya setelah selesai.
- Verifikasi: `npx tsc --noEmit`, `npx eslint .`, `npm run build`. Referensi visual: Figma node 866:6922 (Library), 866:7241 (detail), 866:7958 (modal), 866:7953 (toast), Rolexis 782:22837 (dropdown).
