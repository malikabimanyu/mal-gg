import type { NextConfig } from "next";

/**
 * Zona Bretford — aplikasi Next terpisah yang di-deploy sendiri di Vercel.
 * Semua permintaan ke /bretford/library di mal.gg diteruskan ke sana tanpa
 * mengubah URL di browser pengunjung.
 */
const BRETFORD_ZONE = "https://<domain-vercel-bretford>";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/bretford/library",
        destination: `${BRETFORD_ZONE}/bretford/library`,
      },
      {
        source: "/bretford/library/:path*",
        destination: `${BRETFORD_ZONE}/bretford/library/:path*`,
      },
    ];
  },
};

export default nextConfig;
