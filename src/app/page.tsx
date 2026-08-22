import { ActionButtons } from "@/components/action-buttons";
import { BioBlock } from "@/components/bio-block";
import { CardGame } from "@/components/card-game";
import { Divider } from "@/components/divider";
import { ProfileAvatar } from "@/components/profile-avatar";
import { ProjectList } from "@/components/project-list";
import { Reveal } from "@/components/reveal";

export default function Home() {
  return (
    <main className="flex min-h-dvh items-start justify-center px-4 py-6 sm:px-6 sm:py-10 md:py-[101px]">
      <article className="w-full max-w-[702px] rounded-[12px] bg-card shadow-[inset_0_0_0_1px_var(--color-hairline)] px-6 py-9 sm:px-10 sm:py-12 md:px-[72px] md:py-[72px]">
        <Reveal className="flex flex-col gap-9 sm:gap-[50px]">
          <div data-reveal>
            <ProfileAvatar />
          </div>
          <div data-reveal>
            <ActionButtons />
          </div>
          <div data-reveal>
            <CardGame />
          </div>
          <div data-reveal>
            <BioBlock />
          </div>
          <div data-reveal>
            <Divider />
          </div>
          <div data-reveal>
            <ProjectList />
          </div>
        </Reveal>
      </article>
    </main>
  );
}
