import Link from "next/link";
import { Calendar, Search } from "lucide-react";
import { AnimatedSection } from "@/components/ui/AnimatedSection";

type Props = { locale?: "fr" | "en" };

/** Bandeau post-hero : discovery Audit + RDV (funnels secondaires). */
export function DiscoveryBanner({ locale = "fr" }: Props) {
  const isEn = locale === "en";

  const items = isEn
    ? [
        {
          href: "/en/free-audit",
          icon: Search,
          title: "Free website audit",
          description: "Performance, SEO and mobile — no commitment.",
          cta: "Request an audit",
          track: "discovery_audit",
        },
        {
          href: "/en/book",
          icon: Calendar,
          title: "Book a 30-min call",
          description: "Align on scope and get a free custom quote.",
          cta: "Choose a slot",
          track: "discovery_book",
        },
      ]
    : [
        {
          href: "/audit-gratuit",
          icon: Search,
          title: "Audit web gratuit",
          description: "Performance, SEO et mobile — sans engagement.",
          cta: "Demander un audit",
          track: "discovery_audit",
        },
        {
          href: "/rendez-vous",
          icon: Calendar,
          title: "Prendre rendez-vous",
          description: "30 minutes pour cadrer votre projet et votre devis.",
          cta: "Choisir un créneau",
          track: "discovery_book",
        },
      ];

  return (
    <AnimatedSection className="border-b border-gray/40 bg-gray-light/50 py-10 md:py-12">
      <div className="container mx-auto px-4 md:px-6 lg:px-8">
        <div className="grid gap-4 md:grid-cols-2">
          {items.map(({ href, icon: Icon, title, description, cta, track }) => (
            <Link
              key={href}
              href={href}
              data-track-cta={track}
              className="group flex items-start gap-4 rounded-2xl border border-gray/60 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-light text-primary">
                <Icon className="h-5 w-5" aria-hidden />
              </span>
              <span className="min-w-0">
                <span className="block font-bold text-foreground group-hover:text-primary">
                  {title}
                </span>
                <span className="mt-1 block text-sm text-gray-text">{description}</span>
                <span className="mt-2 inline-block text-sm font-semibold text-primary">
                  {cta} →
                </span>
              </span>
            </Link>
          ))}
        </div>
      </div>
    </AnimatedSection>
  );
}
