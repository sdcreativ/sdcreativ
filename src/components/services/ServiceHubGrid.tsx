import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { AnimatedCard } from "@/components/ui/AnimatedSection";
import { services } from "@/content/services";
import { getServiceHref, getServiceHubLinkLabel } from "@/lib/services";

type Props = {
  limit?: number;
  className?: string;
};

export function ServiceHubGrid({ limit, className }: Props) {
  const items = limit ? services.slice(0, limit) : services;

  return (
    <div
      className={
        className ??
        "grid gap-6 md:grid-cols-2 xl:grid-cols-3"
      }
    >
      {items.map((service, i) => {
        const Icon = service.icon;
        const href = getServiceHref(service);
        return (
          <AnimatedCard
            key={service.id}
            delay={i * 0.05}
            className="group flex flex-col rounded-2xl border border-gray/60 bg-white p-8 shadow-sm transition-all hover:border-primary/20 hover:shadow-lg"
          >
            <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-light transition-colors group-hover:bg-primary/10">
              <Icon className="h-7 w-7 text-primary" aria-hidden />
            </div>
            <h2 className="text-xl font-bold text-foreground">{service.title}</h2>
            <p className="mt-2 flex-1 text-sm leading-relaxed text-gray-text">
              {service.description}
            </p>
            <ul className="mt-5 space-y-2">
              {service.features.slice(0, 4).map((feature) => (
                <li
                  key={feature}
                  className="flex items-start gap-2 text-sm text-foreground/80"
                >
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                  {feature}
                </li>
              ))}
            </ul>
            <Link
              href={href}
              className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-primary transition-colors hover:text-primary-dark"
            >
              {getServiceHubLinkLabel(service)}
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
            </Link>
          </AnimatedCard>
        );
      })}
    </div>
  );
}
