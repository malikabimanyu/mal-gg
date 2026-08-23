import type { Metadata } from "next";
import Script from "next/script";
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

        {/* Vemetric — analitik.
            Antrean disiapkan lebih dulu (`beforeInteractive`) supaya ikut
            tercetak di HTML awal, jadi panggilan vmtrc() apa pun tertampung
            sebelum main.js selesai dimuat. Skrip utamanya sendiri memakai
            strategi bawaan Next untuk analitik: dimuat awal, tapi tidak
            mendahului render halaman. */}
        <Script id="vemetric-queue" strategy="beforeInteractive">
          {`window.vmtrcq = window.vmtrcq || [];window.vmtrc = window.vmtrc || function (){window.vmtrcq.push(Array.prototype.slice.call(arguments))};`}
        </Script>
        <Script
          id="vmtrc-scr"
          src="https://cdn.vemetric.com/main.js"
          data-token="dpcEtBL1Wk0qVdCc"
          strategy="afterInteractive"
        />
      </body>
    </html>
  );
}
