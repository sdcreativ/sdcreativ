import Link from "next/link";
import {
  Clock,
  Cookie,
  Database,
  FileText,
  Globe,
  Lock,
  Mail,
  Scale,
  Shield,
  Target,
  User,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/Button";
import {
  privacyPolicySections,
  privacyPolicyToc,
  type PrivacySection,
} from "@/content/privacy-policy";
import { CONTACT, SITE } from "@/lib/constants";
import { cn } from "@/lib/utils";

const sectionIcons: Record<string, LucideIcon> = {
  responsable: User,
  donnees: Database,
  finalites: Target,
  "base-legale": Scale,
  "sous-traitants": Users,
  conservation: Clock,
  droits: Shield,
  cookies: Cookie,
  securite: Lock,
  modifications: FileText,
};

function ContactBlock() {
  return (
    <address className="not-italic">
      <p className="font-semibold text-foreground">{SITE.name}</p>
      <p className="mt-1 text-gray-text">{CONTACT.address}</p>
      <p className="mt-2">
        <a
          href={`mailto:${CONTACT.email}`}
          className="inline-flex items-center gap-2 font-medium text-primary hover:underline"
        >
          <Mail className="h-4 w-4" aria-hidden />
          {CONTACT.email}
        </a>
      </p>
    </address>
  );
}

function SectionBody({ section }: { section: PrivacySection }) {
  return (
    <div className="mt-5 space-y-5">
      {section.intro && (
        <p className="leading-relaxed text-gray-text">{section.intro}</p>
      )}

      {section.paragraphs?.map((paragraph) => {
        if (paragraph === "__CONTACT_BLOCK__") {
          return (
            <div
              key={paragraph}
              className="rounded-xl border border-primary/15 bg-primary-light/40 p-5"
            >
              <ContactBlock />
            </div>
          );
        }
        return (
          <p key={paragraph} className="leading-relaxed text-gray-text">
            {paragraph}
          </p>
        );
      })}

      {section.dataCategories && (
        <ul className="grid gap-3 sm:grid-cols-2">
          {section.dataCategories.map((item) => (
            <li
              key={item.label}
              className="rounded-xl border border-gray/60 bg-gray-light/50 p-4"
            >
              <p className="text-sm font-semibold text-foreground">{item.label}</p>
              <p className="mt-1 text-sm leading-relaxed text-gray-text">{item.details}</p>
            </li>
          ))}
        </ul>
      )}

      {section.subprocessors && (
        <ul className="space-y-3">
          {section.subprocessors.map((item) => (
            <li
              key={item.name}
              className="flex gap-3 rounded-xl border border-gray/60 bg-gray-light/50 p-4"
            >
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-sm font-bold text-primary">
                {item.name.charAt(0)}
              </span>
              <div>
                <p className="font-semibold text-foreground">{item.name}</p>
                <p className="mt-0.5 text-sm leading-relaxed text-gray-text">{item.role}</p>
              </div>
            </li>
          ))}
        </ul>
      )}

      {section.bullets && (
        <ul className="space-y-2.5">
          {section.bullets.map((item) => (
            <li key={item} className="flex gap-3 text-sm leading-relaxed text-gray-text">
              <span
                className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary"
                aria-hidden
              />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      )}

      {section.footer && (
        <p className="leading-relaxed text-gray-text">
          {section.footer === "__RIGHTS_CONTACT__" ? (
            <>
              Pour exercer vos droits :{" "}
              <a
                href={`mailto:${CONTACT.email}`}
                className="font-medium text-primary hover:underline"
              >
                {CONTACT.email}
              </a>
              . Vous pouvez également introduire une réclamation auprès de l&apos;Autorité de
              protection des données personnelles de Côte d&apos;Ivoire.
            </>
          ) : (
            section.footer
          )}
        </p>
      )}
    </div>
  );
}

export function PrivacyPolicyContent() {
  return (
    <>
      <section className="border-b border-gray/40 bg-gray-light py-12 md:py-16">
        <div className="container mx-auto max-w-6xl px-4 md:px-6 lg:px-8">
          <div className="rounded-2xl border border-gray/60 bg-white p-6 shadow-sm md:p-8">
            <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
              <div className="max-w-3xl">
                <div className="inline-flex items-center gap-2 rounded-full bg-primary-light px-3 py-1 text-xs font-semibold uppercase tracking-wider text-primary">
                  <Globe className="h-3.5 w-3.5" aria-hidden />
                  RGPD & loi ivoirienne 2013-450
                </div>
                <p className="mt-4 text-base leading-relaxed text-gray-text md:text-lg">
                  <strong className="text-foreground">{SITE.name}</strong> s&apos;engage à
                  protéger la vie privée des utilisateurs de son site. Cette politique décrit
                  comment nous collectons, utilisons et protégeons vos données personnelles.
                </p>
              </div>
              <div className="shrink-0 rounded-xl border border-gray/60 bg-gray-light/60 px-5 py-4 text-sm">
                <p className="font-semibold text-foreground">Dernière mise à jour</p>
                <p className="mt-1 text-gray-text">Juillet 2026</p>
                <Link
                  href={`mailto:${CONTACT.email}`}
                  className="mt-3 inline-flex items-center gap-1.5 font-medium text-primary hover:underline"
                >
                  <Mail className="h-4 w-4" aria-hidden />
                  Nous écrire
                </Link>
              </div>
            </div>
          </div>

          <nav
            aria-label="Sommaire de la politique"
            className="mt-8 flex gap-2 overflow-x-auto pb-1 lg:hidden"
          >
            {privacyPolicyToc.map((item) => (
              <a
                key={item.id}
                href={`#${item.id}`}
                className="shrink-0 rounded-full border border-gray/60 bg-white px-4 py-2 text-sm font-medium text-foreground/80 transition-colors hover:border-primary/30 hover:text-primary"
              >
                {item.title}
              </a>
            ))}
          </nav>
        </div>
      </section>

      <section className="py-12 md:py-16">
        <div className="container mx-auto max-w-6xl px-4 md:px-6 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,15rem)_1fr] lg:gap-14">
            <nav
              aria-label="Sommaire de la politique"
              className="hidden lg:block"
            >
              <div className="sticky top-28 rounded-2xl border border-gray/60 bg-white p-5 shadow-sm">
                <p className="text-xs font-bold uppercase tracking-widest text-gray-text">
                  Sommaire
                </p>
                <ol className="mt-4 space-y-1">
                  {privacyPolicyToc.map((item, index) => (
                    <li key={item.id}>
                      <a
                        href={`#${item.id}`}
                        className="flex gap-2 rounded-lg px-2 py-2 text-sm text-foreground/75 transition-colors hover:bg-primary-light/50 hover:text-primary"
                      >
                        <span className="font-mono text-xs text-primary/60">
                          {String(index + 1).padStart(2, "0")}
                        </span>
                        {item.title}
                      </a>
                    </li>
                  ))}
                </ol>
              </div>
            </nav>

            <div className="min-w-0 space-y-6">
              {privacyPolicySections.map((section) => {
                const Icon = sectionIcons[section.id] ?? FileText;
                return (
                  <article
                    key={section.id}
                    id={section.id}
                    className={cn(
                      "scroll-mt-28 rounded-2xl border border-gray/60 bg-white p-6 shadow-sm md:p-8",
                      section.id === "cookies" && "ring-1 ring-primary/10",
                    )}
                  >
                    <header className="flex items-start gap-4">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-light text-primary">
                        <Icon className="h-5 w-5" aria-hidden />
                      </div>
                      <h2 className="pt-1.5 text-xl font-bold text-foreground md:text-2xl">
                        {section.title}
                      </h2>
                    </header>
                    <SectionBody section={section} />
                  </article>
                );
              })}

              <div className="rounded-2xl border border-primary/20 bg-primary-light/40 p-6 md:p-8">
                <h2 className="text-xl font-bold text-foreground">Contact</h2>
                <p className="mt-3 leading-relaxed text-gray-text">
                  Pour toute question relative à cette politique ou à vos données personnelles :
                </p>
                <Button href={`mailto:${CONTACT.email}`} className="mt-5">
                  <Mail className="h-4 w-4" aria-hidden />
                  {CONTACT.email}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
