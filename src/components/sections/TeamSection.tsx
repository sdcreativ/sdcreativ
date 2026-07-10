import Image from "next/image";
import { AnimatedSection, AnimatedCard } from "@/components/ui/AnimatedSection";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { DEFAULT_IMAGE_POSITION } from "@/lib/image-position";
import { resolveImageDisplayUrl, isProxiedMediaUrl } from "@/lib/image-url";
import { getTeamMembers } from "@/lib/public-team";

type Props = {
  locale?: "fr" | "en";
};

export async function TeamSection({ locale = "fr" }: Props) {
  const teamMembers = await getTeamMembers(locale);

  return (
    <AnimatedSection className="bg-white py-20 md:py-28" id="equipe">
      <div className="container mx-auto px-4 md:px-6 lg:px-8">
        <SectionHeading
          eyebrow="L'équipe"
          title="Les visages derrière"
          highlight="SD CREATIV"
          description="Une équipe fondatrice complémentaire, entre vision stratégique, excellence technique et ancrage local en Côte d'Ivoire."
          className="mb-14"
        />

        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
          {teamMembers.map((member, i) => {
            const imageSrc = resolveImageDisplayUrl(member.image);
            return (
            <AnimatedCard
              key={member.id}
              delay={i * 0.08}
              className="group flex h-full flex-col items-center rounded-2xl border border-gray/60 bg-white p-6 text-center shadow-sm transition-shadow hover:shadow-lg"
            >
              <div className="relative mb-5 h-28 w-28 shrink-0 overflow-hidden rounded-full bg-gray-light ring-4 ring-primary-light shadow-md transition-transform duration-300 group-hover:scale-105 md:h-32 md:w-32">
                <Image
                  src={imageSrc}
                  alt={member.imageAlt}
                  fill
                  sizes="128px"
                  unoptimized={isProxiedMediaUrl(imageSrc)}
                  className="object-cover"
                  style={{ objectPosition: member.imagePosition ?? DEFAULT_IMAGE_POSITION }}
                />
              </div>

              <h3 className="text-lg font-bold leading-snug text-foreground">
                {member.name}
              </h3>
              <p className="mt-2 text-sm font-semibold text-primary">{member.role}</p>
              <p className="mt-4 flex-1 text-sm leading-relaxed text-gray-text">
                {member.missions}
              </p>
            </AnimatedCard>
            );
          })}
        </div>
      </div>
    </AnimatedSection>
  );
}
