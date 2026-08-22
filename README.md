# mal.gg

Situs pribadi Mal — satu halaman, di-slice dari Figma.

## Menjalankan

```bash
npm install
npm run dev
```

Buka http://localhost:3000.

## Susunan

```
src/
  app/         layout (font, metadata, ikon) · page · globals.css (design token)
  components/  profile-avatar · action-buttons · card-game
               bio-block · logo-marquee · divider · project-list · reveal
  lib/         site.ts (semua konten & tautan) · cards.ts · motion.ts
public/        logos · cards · icons · profile · audio
```

Semua teks, tautan, dan daftar logo ada di `src/lib/site.ts` — ubah di situ, bukan di komponen.

Warna, bayangan, dan font didefinisikan sebagai token di `src/app/globals.css`.

## Catatan

- Stack: Next.js (App Router) · Tailwind v4 · anime.js v4
- Aset sumber (foto mentah, sprite kartu asli, file audio mentah) sengaja tidak
  masuk repo; yang terpakai sudah diekspor ke `public/`.
- Setiap animasi menghormati `prefers-reduced-motion`.
