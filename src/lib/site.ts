export const site = {
  name: "Mal",
  title: "Mal — Lead Project Designer",
  description:
    "Lead project designer at Keitoto, a design and development studio I co-founded. Building an AI trading bot on the side.",
  links: {
    hire: "https://calendly.com/hello-keitoto/30min",
    sayHi: "https://x.com/malikyoloo",
  },
} as const;

/** Isi bio persis seperti di Figma. Tiap item = satu paragraf. */
export const bio = [
  "I’m Mal,",
  "I’ve been a lead project designer for nine years at Keitoto, a design and development studio I co-founded. I run a team of 19 people across all roles, design and development included. Basically, I close deals and make sure clients get a fucking great ROI.",
  "Outside of work I’m into trading, finance, and math. Most of my free time now goes into building an AI trading bot that thinks and trades on its own. It reads the market and makes its own calls. Entries, exits, risk, all handled by the bot, not me.",
] as const;

export const logosLabel = "Companies we’ve worked with:";

export type Logo = {
  name: string;
  src: string;
  /** Situs perusahaan; logo dibuka di tab baru. */
  href: string;
  /** Dimensi asli file — dipakai next/image supaya rasio tidak melar. */
  width: number;
  height: number;
  /**
   * Tinggi tampil (px). Bukan angka mentah dari Figma — tinggi tiap logo
   * dihitung ulang agar luas tintanya kira-kira seimbang, supaya logo padat
   * seperti Hyre dan Gensync tidak tampak kekecilan di samping wordmark lebar.
   */
  displayHeight: number;
  /** Kalau diisi, logo ini punya tooltip funding yang muncul bergiliran. */
  tooltip?: string;
};

export const logos: Logo[] = [
  {
    name: "Octolane AI",
    src: "/logos/octolane.avif",
    href: "https://www.octolane.com/",
    width: 560,
    height: 99,
    displayHeight: 17.5,
    tooltip: "2.6 million funding",
  },
  {
    name: "Gameover",
    src: "/logos/gameover.avif",
    href: "https://gametune.ai/",
    width: 496,
    height: 129,
    displayHeight: 18.4,
  },
  {
    name: "PortPro",
    src: "/logos/portpro.avif",
    href: "https://portpro.io/",
    width: 496,
    height: 76,
    displayHeight: 17.2,
    tooltip: "12 million funding",
  },
  {
    name: "Creatorspace",
    src: "/logos/creatorspace.avif",
    href: "https://creatorspace.co/",
    width: 624,
    height: 115,
    displayHeight: 17.9,
  },
  {
    name: "Rabot",
    src: "/logos/rabot.avif",
    href: "https://rabot.us/",
    width: 380,
    height: 105,
    displayHeight: 19.3,
    tooltip: "7.1 million funding",
  },
  {
    name: "BCMS",
    src: "/logos/bcms.avif",
    href: "https://www.thebcms.com/",
    width: 483,
    height: 162,
    displayHeight: 23.7,
  },
  {
    name: "Fluorine",
    src: "/logos/fluorine.avif",
    href: "https://fluorine.app/",
    width: 525,
    height: 105,
    displayHeight: 19.0,
  },
  {
    name: "Gensync",
    src: "/logos/gensync.avif",
    href: "https://gensync.ai/",
    width: 482,
    height: 130,
    displayHeight: 22.0,
  },
  {
    name: "Hyre",
    src: "/logos/hyre.avif",
    href: "https://www.hyreup.com/",
    width: 409,
    height: 129,
    displayHeight: 21.6,
  },
  {
    name: "Prospexs",
    src: "/logos/prospexs.avif",
    href: "https://www.prospexs.ai/",
    width: 590,
    height: 94,
    displayHeight: 17.3,
  },
  {
    name: "Rescue Packout",
    src: "/logos/rescue-packout.avif",
    href: "https://www.rescuepackout.com/",
    width: 664,
    height: 87,
    displayHeight: 16.7,
  },
  {
    name: "Truckup",
    src: "/logos/truckup.avif",
    href: "https://www.truckup.com/",
    width: 368,
    height: 117,
    displayHeight: 23.3,
  },
];

export type Project = {
  name: string;
  description: string;
  /** Tombol yang muncul saat baris ini di-hover (Figma 149:220 & 176:1104). */
  badge: { label: string; icon: string; href: string };
};

export const projects: Project[] = [
  {
    name: "Tradeeers",
    description: "AI trading that have consciousness",
    badge: {
      label: "Tradeeers",
      icon: "/icons/tradeeers.png",
      href: "https://www.tradeeers.com",
    },
  },
  {
    name: "Keitoto Studio",
    description: "Product & marketing design",
    // Ikonnya identik dengan yang dipakai tombol "Hire Us", jadi dipakai ulang.
    badge: {
      label: "Keitoto",
      icon: "/icons/hire.png",
      href: "https://www.keitoto.com",
    },
  },
];
