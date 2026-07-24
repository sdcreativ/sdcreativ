import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { AnimatedSection } from "@/components/ui/AnimatedSection";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { TeamOrgChart } from "@/components/sections/TeamOrgChart";
import { getTeamMembers } from "@/lib/public-team";

type Props = { locale?: "fr" | "en" };

export async function TeamPreviewSection({ locale = "fr" }: Props) {
  const isEn = locale === "en";
  const teamMembers = await getTeamMembers(isEn ? "en" : "fr");
  if (teamMembers.length === 0) return null;

  return (
    <AnimatedSection className="bg-gray-light py-20 md:py-28" id="equipe-apercu">
      <div className="container mx-auto px-4 md:px-6 lg:px-8">
        <SectionHeading
          eyebrow={isEn ? "The team" : "L'équipe"}
          title={isEn ? "Founders" : "Des fondateurs"}
          highlight={isEn ? "who care" : "engagés"}
          description={
            isEn
              ? "Strategic vision, technical excellence and local roots — a complementary team at your service."
              : "Vision stratégique, excellence technique et ancrage local — une équipe complémentaire à votre service."
          }
          className="mb-14"
        />

        <TeamOrgChart members={teamMembers} size="compact" />

        <p className="mt-10 text-center">
          <Link
            href={isEn ? "/en/about#equipe" : "/a-propos#equipe"}
            className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
          >
            {isEn ? "Learn more about the team" : "En savoir plus sur l'équipe"}
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </p>
      </div>
    </AnimatedSection>
  );
}
