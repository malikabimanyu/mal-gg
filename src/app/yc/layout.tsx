import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

const geist = Geist({ subsets: ["latin"], variable: "--font-yc-sans" });
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-yc-mono" });

export const metadata: Metadata = {
  title: "YC Founder Directory — mal.gg",
  description: "Every Y Combinator founder, filterable by what the data actually says: batch, role, background, location and more.",
};

/**
 * The directory is a self-contained sub-app: its tokens live in the "YC" section of
 * globals.css under the `yc-` prefix and its base styles are scoped to `.yc-root`, so
 * nothing here leaks into the rest of mal.gg.
 */
export default function YcLayout({ children }: { children: React.ReactNode }) {
  return <div className={`yc-root ${geist.variable} ${geistMono.variable}`}>{children}</div>;
}
