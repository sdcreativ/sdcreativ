import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { AnimatedSection, AnimatedCard } from "@/components/ui/AnimatedSection";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { DEFAULT_IMAGE_POSITION } from "@/lib/image-position";
import { getTeamMembers } from "@/lib/public-team";

export async function TeamPreviewSection() {
  const teamMembers = await getTeamMembers("fr");

  return (
    <AnimatedSection className="bg-gray-light py-20 md:py-28" id="equipe-apercu">
      <div className="container mx-auto px-4 md:px-6 lg:px-8">
        <SectionHeading
          eyebrow="L'équipe"
          title="Des fondateurs"
          highlight="engagés"
          description="Vision stratégique, excellence technique et ancrage local — une équipe complémentaire à votre service."
          className="mb-14"
        />

        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
          {teamMembers.map((member, i) => (
            <AnimatedCard
              key={member.id}
              delay={i * 0.06}
              className="group flex flex-col items-center rounded-2xl border border-gray/60 bg-white p-6 text-center shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="relative mb-4 h-20 w-20 overflow-hidden rounded-full ring-4 ring-primary-light">
                <Image
                  src={member.image}
                  alt={member.imageAlt}
                  fill
                  sizes="80px"
                  className="object-cover"
                  style={{ objectPosition: member.imagePosition ?? DEFAULT_IMAGE_POSITION }}
                />
              </div>
              <h3 className="text-base font-bold text-foreground">{member.name}</h3>
              <p className="mt-1 text-xs font-semibold text-primary">{member.role}</p>
            </AnimatedCard>
          ))}
        </div>

        <p className="mt-10 text-center">
          <Link
            href="/a-propos#equipe"
            className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
          >
            En savoir plus sur l&apos;équipe
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </p>
      </div>
    </AnimatedSection>
  );
}
