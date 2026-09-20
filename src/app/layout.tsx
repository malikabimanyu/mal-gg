import type { Metadata } from "next";
import { GoogleAnalytics } from "@next/third-parties/google";
import { Gasoek_One, Inter } from "next/font/google";
import { site } from "@/lib/site";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const gasoek = Gasoek_One({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-gasoek",
  display: "swap",
});

export const metadata: Metadata = {
  title: site.title,
  description: site.description,
  openGraph: {
    title: site.title,
    description: site.description,
    type: "profile",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${inter.variable} ${gasoek.variable}`}>
      <body>
        {children}
        <noscript>
          <style>{`[data-reveal]{opacity:1 !important}`}</style>
        </noscript>
      </body>
      {/* Google Analytics — satu-satunya root layout, jadi mencakup mal.gg,
          /bretford/library, dan /yc sekaligus. Komponen resmi Next memuat
          gtag.js setelah hidrasi supaya tidak mendahului render halaman. */}
      <GoogleAnalytics gaId="G-Q9W67EZTF7" />
    </html>
  );
}
