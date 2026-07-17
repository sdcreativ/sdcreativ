import { AnimatedSection } from "@/components/ui/AnimatedSection";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { TeamOrgChart } from "@/components/sections/TeamOrgChart";
import { getTeamMembers } from "@/lib/public-team";

type Props = {
  locale?: "fr" | "en";
};

export async function TeamSection({ locale = "fr" }: Props) {
  const teamMembers = await getTeamMembers(locale);
  const isEn = locale === "en";

  return (
    <AnimatedSection className="bg-white py-20 md:py-28" id="equipe">
      <div className="container mx-auto px-4 md:px-6 lg:px-8">
        <SectionHeading
          eyebrow={isEn ? "The team" : "L'équipe"}
          title={isEn ? "The faces behind" : "Les visages derrière"}
          highlight="SD CREATIV"
          description={
            isEn
              ? "A complementary founding team, between strategic vision, technical excellence and local roots in Côte d'Ivoire."
              : "Une équipe fondatrice complémentaire, entre vision stratégique, excellence technique et ancrage local en Côte d'Ivoire."
          }
          className="mb-14"
        />

        <TeamOrgChart
          members={teamMembers}
          showMissions
          size="large"
          labels={
            isEn
              ? {
                  leadership: "Leadership & co-founders",
                  operations: "Operations team",
                }
              : {
                  leadership: "Direction & cofondateurs",
                  operations: "Équipe opérationnelle",
                }
          }
        />
      </div>
    </AnimatedSection>
  );
}
