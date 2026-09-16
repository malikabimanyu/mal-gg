import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SourceDetailPage } from "@/bretford/components/source-detail/source-detail-page";
import { getSourceDetail, sourceSlugs } from "@/bretford/lib/sources-data";

/** One static page per source; unknown slugs 404 (see `dynamicParams`). */
export function generateStaticParams() {
  return sourceSlugs.map((slug) => ({ slug }));
}

export const dynamicParams = false;

export async function generateMetadata({ params }: PageProps<"/bretford/library/sources/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const detail = getSourceDetail(slug);
  return { title: detail ? `${detail.title} — Library · Bretford` : "Source not found" };
}

export default async function SourcePage({ params }: PageProps<"/bretford/library/sources/[slug]">) {
  const { slug } = await params;
  const detail = getSourceDetail(slug);
  if (!detail) notFound();

  return <SourceDetailPage detail={detail} />;
}
