import type { Metadata } from "next";
import { Geist } from "next/font/google";

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "Bretford — Library", template: "%s · Bretford" },
  description: "Bretford recruiting dashboard — Library overview and source details.",
};

/**
 * Bretford dashboard, mounted at /bretford/library inside mal.gg.
 * Everything the app needs that the site's root layout doesn't provide
 * (Geist, ink colour, antialiasing) is set on this wrapper; the design tokens
 * themselves live in app/globals.css under "Bretford".
 */
export default function BretfordLayout({ children }: LayoutProps<"/bretford/library">) {
  return (
    <div data-bretford className={`${geist.variable} font-bretford text-loud antialiased`}>
      {children}
    </div>
  );
}
