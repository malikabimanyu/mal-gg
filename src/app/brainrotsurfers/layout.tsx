import type { Metadata, Viewport } from "next";
import { Lilita_One } from "next/font/google";

const lilita = Lilita_One({ weight: "400", subsets: ["latin"], variable: "--font-br-lilita", display: "swap" });

export const metadata: Metadata = {
  title: "Brainrot Surfers — mal.gg",
  description: "A free endless runner with Italian-brainrot characters. Dodge trains, grab coins, outrun the OIIA cat.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#2f8fff",
};

/**
 * Brainrot Surfers is a self-contained sub-app: tokens live in the "Brainrot Surfers" section
 * of globals.css under the `br-` prefix and its base styles are scoped to `.br-root`, which
 * also locks the page into a full-screen, non-scrolling game surface.
 */
export default function BrainrotSurfersLayout({ children }: { children: React.ReactNode }) {
  return <div className={`br-root ${lilita.variable}`}>{children}</div>;
}
