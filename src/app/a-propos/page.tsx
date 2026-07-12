import { Target, Users, Lightbulb, Award } from "lucide-react";
import { SitePageHero } from "@/components/ui/SitePageHero";
import { AnimatedCard } from "@/components/ui/AnimatedSection";
import { Button } from "@/components/ui/Button";
import { MethodSection } from "@/components/sections/MethodSection";
import { TeamSection } from "@/components/sections/TeamSection";
import { createMetadata } from "@/lib/metadata";

export const dynamic = "force-dynamic";

export const metadata = createMetadata({
  title: "À propos",
  description:
    "SD CREATIV est une agence web basée à Abidjan, spécialisée dans la création de sites web et solutions digitales pour PME et entrepreneurs.",
  path: "/a-propos",
});

const values = [
  {
    icon: Target,
    title: "Orienté résultats",
    description:
      "Chaque projet est pensé pour générer de la visibilité, des leads et des conversions mesurables.",
  },
  {
    icon: Users,
    title: "Proximité & écoute",
    description:
      "Un accompagnement humain, transparent et adapté aux réalités des PME ivoiriennes.",
  },
  {
    icon: Lightbulb,
    title: "Innovation accessible",
    description:
      "Des technologies modernes rendues accessibles, sans jargon ni complexité inutile.",
  },
  {
    icon: Award,
    title: "Exigence qualité",
    description:
      "Design soigné, code propre, performances optimisées et bonnes pratiques SEO intégrées.",
  },
];

export default function AboutPage() {
  return (
    <>
      <SitePageHero pageKey="a-propos" />

      <section className="py-20 md:py-28">
        <div className="container mx-auto grid items-center gap-12 px-4 md:px-6 lg:grid-cols-2 lg:px-8">
          <div>
            <h2 className="text-3xl font-bold text-foreground">Notre mission</h2>
            <p className="mt-6 text-lg leading-relaxed text-gray-text">
              Nous croyons que chaque entreprise mérite une présence en ligne
              professionnelle, quel que soit son budget. Notre mission est de
              démocratiser l&apos;accès au web de qualité en Côte d&apos;Ivoire,
              en proposant des sites modernes, rapides et orientés business.
            </p>
            <p className="mt-4 text-lg leading-relaxed text-gray-text">
              De la création de site vitrine au e-commerce, en passant par le SEO
              local et l&apos;identité visuelle, nous couvrons l&apos;ensemble du
              parcours digital de nos clients — avec un suivi de A à Z.
            </p>
            <Button href="/devis" className="mt-8">
              Travaillons ensemble
            </Button>
          </div>
          <div className="rounded-2xl bg-gradient-to-br from-primary/10 to-gray-light p-10">
            <div className="grid grid-cols-2 gap-6 text-center">
              {[
                { value: "50+", label: "Projets livrés" },
                { value: "7", label: "Étapes méthode" },
                { value: "100%", label: "Sites responsive" },
                { value: "24h", label: "Réponse moyenne" },
              ].map((stat) => (
                <div key={stat.label} className="rounded-xl bg-white p-6 shadow-sm">
                  <p className="text-3xl font-bold text-primary">{stat.value}</p>
                  <p className="mt-1 text-sm text-gray-text">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-gray-light py-20 md:py-28">
        <div className="container mx-auto px-4 md:px-6 lg:px-8">
          <h2 className="mb-12 text-center text-3xl font-bold text-foreground">
            Nos valeurs
          </h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {values.map((value, i) => {
              const Icon = value.icon;
              return (
                <AnimatedCard
                  key={value.title}
                  delay={i * 0.08}
                  className="rounded-2xl bg-white p-6 shadow-sm"
                >
                  <Icon className="mb-4 h-8 w-8 text-primary" aria-hidden />
                  <h3 className="font-bold text-foreground">{value.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-gray-text">
                    {value.description}
                  </p>
                </AnimatedCard>
              );
            })}
          </div>
        </div>
      </section>

      <TeamSection />

      <MethodSection />
    </>
  );
}
