import { bio, logosLabel } from "@/lib/site";
import { LogoMarquee } from "@/components/logo-marquee";

export function BioBlock() {
  return (
    <section>
      <div className="flex flex-col gap-[26px] text-[16px] leading-[26px] tracking-[-0.16px] text-ink">
        {bio.map((paragraph, i) => (
          <p key={i}>{paragraph}</p>
        ))}
        <p className="text-muted">{logosLabel}</p>
      </div>
      {/* Figma memberi jarak 24px ke strip logo, tapi di Figma belum ada
          tooltip. Tooltip butuh ~27px di atas strip, jadi jaraknya dilebarkan
          supaya tidak menabrak baris label di atasnya. */}
      <div className="mt-[40px] flow-root">
        <LogoMarquee />
      </div>
    </section>
  );
}
