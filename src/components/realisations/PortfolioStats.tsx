import { AnimatedCard } from "@/components/ui/AnimatedSection";
import type { PortfolioPublicStat } from "@/lib/portfolio-public-stats";

type Props = {
  stats: PortfolioPublicStat[];
};

export function PortfolioStats({ stats }: Props) {
  if (stats.length === 0) return null;

  return (
    <div className="mb-14 grid grid-cols-2 gap-4 md:grid-cols-4">
      {stats.map((stat, i) => (
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
