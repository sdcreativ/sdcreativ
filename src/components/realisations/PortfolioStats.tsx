import { AnimatedCard } from "@/components/ui/AnimatedSection";

export const portfolioStats = [
  { value: "50+", label: "Projets livrés" },
  { value: "15", label: "Secteurs d'activité" },
  { value: "98%", label: "Clients satisfaits" },
  { value: "25 j", label: "Délai moyen" },
] as const;

export function PortfolioStats() {
  return (
    <div className="mb-14 grid grid-cols-2 gap-4 md:grid-cols-4">
      {portfolioStats.map((stat, i) => (
        <AnimatedCard
          key={stat.label}
          delay={i * 0.05}
          className="rounded-2xl border border-gray bg-white p-6 text-center shadow-sm"
        >
          <p className="text-3xl font-bold text-primary md:text-4xl">{stat.value}</p>
          <p className="mt-1 text-sm text-gray-text">{stat.label}</p>
        </AnimatedCard>
      ))}
    </div>
  );
}
