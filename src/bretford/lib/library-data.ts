import type { IconName } from "@/bretford/components/ui/icon";
import type { Status } from "@/bretford/components/ui/badge";
import type { SourceSlug } from "@/bretford/lib/sources-data";

/* ------------------------------------------------------------------ */
/* Sidebar                                                             */
/* ------------------------------------------------------------------ */

export type NavItem = { label: string; icon: IconName; active?: boolean };

export const workspace = { name: "Bretford" };

/** Roles offered for each invitee in the Invite modal. */
export const memberRoles = ["Owner", "Editor", "Viewer"] as const;
export type MemberRole = (typeof memberRoles)[number];

export const mainMenu: NavItem[] = [
  { label: "Dashboard", icon: "home-line" },
  { label: "Sourcing", icon: "file-search" },
  { label: "Library", icon: "solar-library-bold", active: true },
  { label: "Emails", icon: "mail-01" },
  { label: "Sequences", icon: "send-03" },
  { label: "Interviews", icon: "monitor-02" },
];

export type Collection = {
  label: string;
  icon: IconName;
  /** Expanded collection showing child batches */
  children?: string[];
};

export const collections: Collection[] = [
  { label: "Software engineers", icon: "engineering" },
  { label: "Product designers", icon: "palette" },
  { label: "UI designer", icon: "folder-emoji", children: ["Batch 1", "Batch 2", "Batch 3"] },
];

export const footerMenu: NavItem[] = [
  { label: "Knowledge hub", icon: "container" },
  { label: "Invite team", icon: "users-03" },
  { label: "Settings", icon: "settings-01" },
];

/* ------------------------------------------------------------------ */
/* Header / toolbar                                                    */
/* ------------------------------------------------------------------ */

export const credits = 2500;

export const tabs = ["All", "Group", "Database"] as const;
export type Tab = (typeof tabs)[number];

export const orderBy = "most recent";

/* ------------------------------------------------------------------ */
/* Stats                                                               */
/* ------------------------------------------------------------------ */

export type Stat = {
  label: string;
  value: string;
  hint: string;
  icon: IconName;
  /** Tile color behind the icon (Tailwind color token name) */
  tone: "blue" | "pink" | "indigo";
};

export const stats: Stat[] = [
  { label: "Total source", value: "6 connected", hint: "Across all your integrations", icon: "globe", tone: "blue" },
  { label: "Networking", value: "9 searchable", hint: "Source over your network", icon: "route", tone: "pink" },
  {
    label: "Applicant Tracking System (ATS)",
    value: "connect your ATS",
    hint: "Source over your inbound",
    icon: "file-search-02",
    tone: "indigo",
  },
];

/* ------------------------------------------------------------------ */
/* Sources                                                             */
/* ------------------------------------------------------------------ */

export type Source = {
  /** Route segment of the detail page (/sources/[slug]). */
  slug: SourceSlug;
  title: string;
  description: string;
  /** Color of the small 8×4 pill next to the title */
  tone: "orange" | "blue";
  status: Status;
  candidates: number;
  createdBy: string;
};

export const sources: Source[] = [
  {
    slug: "product-designer",
    title: "Product designer",
    description: "Looking for a product designer with 5 requirement",
    tone: "orange",
    status: "active",
    candidates: 57,
    createdBy: "Anika Curtis",
  },
  {
    slug: "software-engineer",
    title: "Software engineer",
    description: "Looking for a software engineer with 5 requirement",
    tone: "blue",
    status: "active",
    candidates: 57,
    createdBy: "Anika Curtis",
  },
  {
    slug: "data-analyst",
    title: "Data analyst",
    description: "Looking for a data analyst with 5 requirement",
    tone: "orange",
    status: "active",
    candidates: 57,
    createdBy: "Anika Curtis",
  },
  {
    slug: "motion-designer",
    title: "Motion designer",
    description: "Looking for a motion designer with 5 requirement",
    tone: "blue",
    status: "active",
    candidates: 57,
    createdBy: "Anika Curtis",
  },
];

/* ------------------------------------------------------------------ */
/* Database table                                                      */
/* ------------------------------------------------------------------ */

export type DatabaseRow = {
  name: string;
  records: number;
  status: Status;
};

export const databases: DatabaseRow[] = [
  { name: "Internal Database", records: 256, status: "active" },
  { name: "Imported Data", records: 183, status: "synced" },
  { name: "Referral Pool", records: 437, status: "active" },
  { name: "Internship pipeline", records: 75, status: "active" },
  { name: "Engineering dev", records: 84, status: "synced" },
  { name: "Marketing analyst", records: 93, status: "archived" },
];

/* ------------------------------------------------------------------ */
/* Groups                                                              */
/* ------------------------------------------------------------------ */

export type Group = {
  name: string;
  sources: number;
  candidates: number;
  databases: number;
};

export const groups: Group[] = [
  { name: "Design Talent Pool", sources: 3, candidates: 128, databases: 2 },
  { name: "Engineering Talent Pool", sources: 2, candidates: 243, databases: 4 },
  { name: "US-Based Candidates", sources: 1, candidates: 87, databases: 1 },
  { name: "Marketing & Growth", sources: 4, candidates: 427, databases: 5 },
  { name: "APAC Talent Pool", sources: 1, candidates: 24, databases: 1 },
];
