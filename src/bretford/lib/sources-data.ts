import type { IconName } from "@/bretford/components/ui/icon";
import type { AvatarTone } from "@/bretford/components/ui/avatar";

/* ------------------------------------------------------------------ */
/* Source detail (Figma 866:7241 "Library - Sources details")          */
/* ------------------------------------------------------------------ */

export const sourceSlugs = ["product-designer", "software-engineer", "data-analyst", "motion-designer"] as const;
export type SourceSlug = (typeof sourceSlugs)[number];

/** Icon shown next to the source title: an exported SVG, or an emoji glyph. */
export type SourceIcon = { kind: "icon"; name: IconName } | { kind: "emoji"; char: string };

export type Member = {
  name: string;
  email: string;
  tone: AvatarTone;
  /** ISO date, formatted by the UI ("March 31, 2026"). */
  joined: string;
  /** Number of connections this member uploaded; 0 renders "no connection uploaded". */
  connections: number;
};

export type Candidate = {
  name: string;
  role: string;
  photo: string;
  /** Member who added the candidate — must match a `Member.name`. */
  createdBy: string;
  joined: string;
  linkedin: string;
};

export type SourceDetail = {
  slug: SourceSlug;
  title: string;
  icon: SourceIcon;
  about: string;
  privacy: string;
  /** Direct search link; the UI shows it truncated with a copy button. */
  searchLink: string;
  members: Member[];
  candidates: Candidate[];
};

const photos = {
  c1: "/bretford/images/candidates/c1.png",
  c2: "/bretford/images/candidates/c2.png",
  c3: "/bretford/images/candidates/c3.png",
  c4: "/bretford/images/candidates/c4.png",
};

const james: Member = {
  name: "James Rosser",
  email: "jamesrosser@gmail.com",
  tone: "purple",
  joined: "2026-03-31",
  connections: 119,
};

const skylar: Member = {
  name: "Skylar Aminoff",
  email: "skylas.aminoff@gmail.com",
  tone: "orange",
  joined: "2026-04-02",
  connections: 0,
};

const searchLink = (slug: SourceSlug) => `https://app.rolexis.com/search/as-${slug}?scope=group&ref=direct`;

export const sourceDetails: Record<SourceSlug, SourceDetail> = {
  "product-designer": {
    slug: "product-designer",
    title: "Product designer",
    icon: { kind: "icon", name: "palette" },
    about: "Looking for a Senior product designer with 5+ year experience in product management.",
    privacy: "anyone with link can search",
    searchLink: searchLink("product-designer"),
    members: [james, skylar],
    candidates: [
      { name: "Chance Dokidis", role: "Software engineer", photo: photos.c1, createdBy: "James Rosser", joined: "2026-04-06", linkedin: "https://www.linkedin.com/in/chance-dokidis" },
      { name: "Tatiana Herwitz", role: "Software engineer", photo: photos.c2, createdBy: "James Rosser", joined: "2026-04-06", linkedin: "https://www.linkedin.com/in/tatiana-herwitz" },
      { name: "Marley Ekstrom Bothman", role: "Product designer", photo: photos.c3, createdBy: "Skylar Aminoff", joined: "2026-04-06", linkedin: "https://www.linkedin.com/in/marley-ekstrom-bothman" },
      { name: "Randy Schleifer", role: "Product designer", photo: photos.c3, createdBy: "Skylar Aminoff", joined: "2026-04-06", linkedin: "https://www.linkedin.com/in/randy-schleifer" },
      { name: "Justin Franci", role: "Product designer", photo: photos.c3, createdBy: "James Rosser", joined: "2026-04-06", linkedin: "https://www.linkedin.com/in/justin-franci" },
      { name: "Jaxson Septimus", role: "UI Designer", photo: photos.c4, createdBy: "Skylar Aminoff", joined: "2026-04-06", linkedin: "https://www.linkedin.com/in/jaxson-septimus" },
    ],
  },

  "software-engineer": {
    slug: "software-engineer",
    title: "Software engineer",
    icon: { kind: "icon", name: "engineering" },
    about: "Looking for a Senior software engineer with 5+ year experience shipping TypeScript and Go services at scale.",
    privacy: "anyone with link can search",
    searchLink: searchLink("software-engineer"),
    members: [james, { ...skylar, connections: 86 }],
    candidates: [
      { name: "Chance Dokidis", role: "Software engineer", photo: photos.c1, createdBy: "James Rosser", joined: "2026-04-06", linkedin: "https://www.linkedin.com/in/chance-dokidis" },
      { name: "Tatiana Herwitz", role: "Software engineer", photo: photos.c2, createdBy: "James Rosser", joined: "2026-04-06", linkedin: "https://www.linkedin.com/in/tatiana-herwitz" },
      { name: "Alena Vetrovs", role: "Backend engineer", photo: photos.c3, createdBy: "Skylar Aminoff", joined: "2026-04-07", linkedin: "https://www.linkedin.com/in/alena-vetrovs" },
      { name: "Corey Lipshutz", role: "Frontend engineer", photo: photos.c4, createdBy: "Skylar Aminoff", joined: "2026-04-07", linkedin: "https://www.linkedin.com/in/corey-lipshutz" },
      { name: "Kadin Baptista", role: "Platform engineer", photo: photos.c1, createdBy: "James Rosser", joined: "2026-04-08", linkedin: "https://www.linkedin.com/in/kadin-baptista" },
      { name: "Lindsey Curtis", role: "Software engineer", photo: photos.c2, createdBy: "Skylar Aminoff", joined: "2026-04-08", linkedin: "https://www.linkedin.com/in/lindsey-curtis" },
    ],
  },

  "data-analyst": {
    slug: "data-analyst",
    title: "Data analyst",
    icon: { kind: "emoji", char: "📊" },
    about: "Looking for a Data analyst with 3+ year experience in SQL, dashboarding and experiment analysis.",
    privacy: "anyone with link can search",
    searchLink: searchLink("data-analyst"),
    members: [{ ...james, connections: 64 }, { ...skylar, connections: 41 }],
    candidates: [
      { name: "Makenna Philips", role: "Data analyst", photo: photos.c2, createdBy: "James Rosser", joined: "2026-04-09", linkedin: "https://www.linkedin.com/in/makenna-philips" },
      { name: "Ryan Botosh", role: "Analytics engineer", photo: photos.c1, createdBy: "James Rosser", joined: "2026-04-09", linkedin: "https://www.linkedin.com/in/ryan-botosh" },
      { name: "Kaiya Dorwart", role: "Data analyst", photo: photos.c3, createdBy: "Skylar Aminoff", joined: "2026-04-10", linkedin: "https://www.linkedin.com/in/kaiya-dorwart" },
      { name: "Carter Saris", role: "BI analyst", photo: photos.c4, createdBy: "Skylar Aminoff", joined: "2026-04-10", linkedin: "https://www.linkedin.com/in/carter-saris" },
      { name: "Zaire Workman", role: "Data analyst", photo: photos.c1, createdBy: "James Rosser", joined: "2026-04-11", linkedin: "https://www.linkedin.com/in/zaire-workman" },
    ],
  },

  "motion-designer": {
    slug: "motion-designer",
    title: "Motion designer",
    icon: { kind: "emoji", char: "🎬" },
    about: "Looking for a Motion designer with 4+ year experience in After Effects, Lottie and product micro-interactions.",
    privacy: "anyone with link can search",
    searchLink: searchLink("motion-designer"),
    members: [{ ...skylar, connections: 27 }, { ...james, connections: 0 }],
    candidates: [
      { name: "Jaxson Septimus", role: "Motion designer", photo: photos.c4, createdBy: "Skylar Aminoff", joined: "2026-04-12", linkedin: "https://www.linkedin.com/in/jaxson-septimus" },
      { name: "Emery Rhiel Madsen", role: "Motion designer", photo: photos.c2, createdBy: "Skylar Aminoff", joined: "2026-04-12", linkedin: "https://www.linkedin.com/in/emery-rhiel-madsen" },
      { name: "Marley Ekstrom Bothman", role: "Product designer", photo: photos.c3, createdBy: "James Rosser", joined: "2026-04-13", linkedin: "https://www.linkedin.com/in/marley-ekstrom-bothman" },
      { name: "Chance Dokidis", role: "3D generalist", photo: photos.c1, createdBy: "Skylar Aminoff", joined: "2026-04-13", linkedin: "https://www.linkedin.com/in/chance-dokidis" },
    ],
  },
};

export function getSourceDetail(slug: string): SourceDetail | undefined {
  return (sourceSlugs as readonly string[]).includes(slug) ? sourceDetails[slug as SourceSlug] : undefined;
}

/** "2026-03-31" → "March 31, 2026" (fixed locale so SSR and client agree). */
export function formatJoinDate(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}
