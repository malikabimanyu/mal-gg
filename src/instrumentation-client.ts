import { vemetric } from "@vemetric/web";

/**
 * Analitik Vemetric.
 *
 * Next menjalankan berkas ini di sisi klien sebelum halaman menjadi
 * interaktif. Paketnya sendiri yang mengurus pencatatan kunjungan, termasuk
 * saat pindah halaman lewat router — hal yang tidak ditangani tag <script>
 * biasa.
 *
 * Token ditulis langsung di sini, bukan lewat variabel lingkungan. Token
 * Vemetric memang publik: ia ikut terkirim ke browser setiap pengunjung dan
 * bisa dilihat siapa saja, jadi tidak ada yang disembunyikan. Menaruhnya di
 * sini berarti tidak ada yang perlu disetel ulang di Vercel dan analitik
 * tidak bisa diam-diam mati karena variabel yang lupa diisi.
 */
try {
  vemetric.init({ token: "dpcEtBL1Wk0qVdCc" });
} catch {
  // Analitik tidak boleh menjatuhkan halaman.
}
