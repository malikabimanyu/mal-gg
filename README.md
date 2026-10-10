# mal.gg

Situs pribadi Mal — satu halaman, di-slice dari Figma.

## Menjalankan

```bash
npm install
npm run dev
```

Buka http://localhost:3000. Dashboard Bretford ada di http://localhost:3000/bretford/library, YC Founder Directory di http://localhost:3000/yc, Brainrot Surfers di http://localhost:3000/brainrotsurfers.

## Susunan

```
src/
  app/         layout (font, metadata, ikon) · page · globals.css (design token)
  components/  profile-avatar · action-buttons · card-game
               bio-block · logo-marquee · divider · project-list · reveal
  lib/         site.ts (semua konten & tautan) · cards.ts · motion.ts
  app/bretford/library/  dashboard Bretford (route + layout Geist)
  bretford/    komponen, primitives, data, dan motion milik dashboard
  app/yc/      YC Founder Directory (page, layout Geist, api/suggest, api/count)
  yc/          komponen, facet registry, query engine milik directory
  app/brainrotsurfers/   Brainrot Surfers (route + layout Lilita One)
  brainrotsurfers/       game three.js (engine, chunk rintangan, karakter, audio) + overlay React
scripts/       brainrotsurfers-*.mjs — model/lingkungan/audio mentah (SUBWAY SURVERS KW/) → public/brainrotsurfers/
public/        logos · cards · icons · profile · audio · bretford/ · yc/ (ikon directory) · brainrotsurfers/
data/          yc.db — SQLite read-only untuk /yc (hasil pack dari pipeline TWITTER/YC)
```

Semua teks, tautan, dan daftar logo ada di `src/lib/site.ts` — ubah di situ, bukan di komponen.

Warna, bayangan, dan font didefinisikan sebagai token di `src/app/globals.css`.

## Catatan

- Stack: Next.js (App Router) · Tailwind v4 · anime.js v4 · three.js (Brainrot Surfers)
- Aset sumber (foto mentah, sprite kartu asli, file audio mentah) sengaja tidak
  masuk repo; yang terpakai sudah diekspor ke `public/`.
- Setiap animasi menghormati `prefers-reduced-motion`.
