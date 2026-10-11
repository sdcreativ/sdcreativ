import Image from "next/image";
import { CheckCircle2, Clock, ShieldCheck, Star } from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { LandingAuditForm } from "@/components/landing/LandingAuditForm";
import { LandingWhatsappButton } from "@/components/landing/LandingWhatsappButton";
import { getRealisations } from "@/lib/cms";
import { isProxiedMediaUrl, resolveImageDisplayUrl } from "@/lib/image-url";
import { getLucideIcon } from "@/lib/lucide-icon-map";
import { createMetadata } from "@/lib/metadata";
import { getSiteAuditSettings } from "@/lib/site-audit-settings";

export const revalidate = 300;

/**
 * Page de destination des publicités (Facebook / Instagram / Google) : une seule offre, un seul objectif.
 * Sans menu ni pied de page (voir HeaderGate / FooterGate), non indexée pour ne pas concurrencer /audit-gratuit.
 */
export const metadata = createMetadata({
  title: "Audit gratuit de votre site web",
  description:
    "Recevez gratuitement l'audit de votre site : vitesse, Google, mobile et sécurité, avec un plan d'action clair. Réponse sous 24 h sur WhatsApp.",
  path: "/offre/audit-gratuit",
  noIndex: true,
});

const REASSURANCE = [
  { icon: Clock, label: "Réponse sous 24 h ouvrées" },
  { icon: ShieldCheck, label: "Gratuit, sans engagement" },
  { icon: Star, label: "Rapport clair, sans jargon" },
];

export default async function OffreAuditGratuitPage() {
  const [content, realisations] = await Promise.all([getSiteAuditSettings(), getRealisations()]);
  const showcase = [...realisations].sort((a, b) => Number(Boolean(b.featured)) - Number(Boolean(a.featured))).slice(0, 3);
  const testimonial = realisations.find((r) => r.testimonial)?.testimonial;

  return (
    <div className="bg-[#F5F6F8] pb-24 md:pb-0">
      <header className="border-b border-[#E3E8F0] bg-white">
        <div className="container mx-auto flex items-center justify-between gap-4 px-4 py-3 md:px-6 lg:px-8">
          <Logo variant="mark" size="header" href={null} priority />
          <LandingWhatsappButton
            label="WhatsApp"
            trackId="landing_header_whatsapp"
            className="px-4 py-2.5 text-sm shadow-none"
          />
        </div>
      </header>

      <section className="relative overflow-hidden bg-gradient-to-br from-[#0175BA] to-[#0471B3] text-white">
        <span aria-hidden className="pointer-events-none absolute -bottom-40 -right-32 h-96 w-96 rounded-full bg-[#1C8AD0]/50" />
        <div className="container relative mx-auto grid items-start gap-10 px-4 py-12 md:px-6 md:py-16 lg:grid-cols-[1.1fr_1fr] lg:px-8">
          <div className="lg:pt-6">
            <p className="text-sm font-bold uppercase tracking-[0.12em] text-white/90">Audit web offert</p>
            <h1 className="mt-3 text-[2.2rem] font-extrabold leading-[1.08] tracking-tight sm:text-5xl">
              Votre site vous rapporte-t-il vraiment des clients&nbsp;?
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-white/90">
              Nous analysons gratuitement votre site — vitesse, visibilité sur Google, affichage mobile et sécurité — et
              vous remettons un plan d&apos;action concret pour attirer plus de demandes.
            </p>
            <ul className="mt-6 space-y-2.5">
              {content.checklist.map((item) => (
                <li key={item} className="flex items-start gap-3 text-base">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-white" aria-hidden />
                  {item}
                </li>
              ))}
            </ul>
            <div className="mt-8 hidden lg:block">
              <LandingWhatsappButton label="Discuter sur WhatsApp" trackId="landing_hero_whatsapp" />
            </div>
          </div>

          <div id="formulaire" className="scroll-mt-6 overflow-hidden rounded-2xl bg-white text-[#010101] shadow-2xl">
            <div aria-hidden className="h-1.5 bg-[#E23944]" />
            <div className="p-6 sm:p-8">
              <h2 className="text-2xl font-extrabold leading-tight">Recevez votre audit gratuit</h2>
              <p className="mt-1.5 text-base text-[#595959]">4 champs, 30 secondes. Nous vous recontactons sur WhatsApp.</p>
              <div className="mt-5">
                <LandingAuditForm />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-[#E3E8F0] bg-white">
        <ul className="container mx-auto grid gap-4 px-4 py-5 sm:grid-cols-3 md:px-6 lg:px-8">
          {REASSURANCE.map(({ icon: Icon, label }) => (
            <li key={label} className="flex items-center justify-center gap-2.5 text-sm font-semibold text-[#010101]">
              <Icon className="h-5 w-5 text-[#0175BA]" aria-hidden />
              {label}
            </li>
          ))}
        </ul>
      </section>

      <section className="py-14 md:py-20">
        <div className="container mx-auto px-4 md:px-6 lg:px-8">
          <h2 className="text-center text-3xl font-extrabold tracking-tight text-[#010101]">Ce que nous vérifions</h2>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {content.points.map((point) => {
              const Icon = getLucideIcon(point.icon);
              return (
                <div key={point.title} className="rounded-2xl border border-[#E3E8F0] bg-white p-6 shadow-sm">
                  <Icon className="mb-4 h-8 w-8 text-[#0175BA]" aria-hidden />
                  <h3 className="font-bold text-[#010101]">{point.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-[#595959]">{point.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {showcase.length > 0 && (
        <section className="bg-white py-14 md:py-20">
          <div className="container mx-auto px-4 md:px-6 lg:px-8">
            <h2 className="text-center text-3xl font-extrabold tracking-tight text-[#010101]">Quelques réalisations</h2>
            <div className="mt-10 grid gap-6 md:grid-cols-3">
              {showcase.map((project) => {
                const src = resolveImageDisplayUrl(project.image);
                return (
                  <figure key={project.id} className="overflow-hidden rounded-2xl border border-[#E3E8F0] bg-white shadow-sm">
                    <div className="relative aspect-[4/3] bg-[#F5F6F8]">
                      <Image
                        src={src}
                        alt={project.imageAlt}
                        fill
                        unoptimized={isProxiedMediaUrl(src)}
                        sizes="(max-width: 768px) 100vw, 33vw"
                        className="object-cover object-top"
                      />
                    </div>
                    <figcaption className="p-5">
                      <p className="text-xs font-bold uppercase tracking-wide text-[#0175BA]">{project.sector}</p>
                      <p className="mt-1 font-bold text-[#010101]">{project.client}</p>
                      {project.metric && (
                        <p className="mt-2 text-sm text-[#595959]">
                          <span className="font-bold text-[#E23944]">{project.metric.value}</span> {project.metric.label}
                        </p>
                      )}
                    </figcaption>
                  </figure>
                );
              })}
            </div>
            {testimonial && (
              <blockquote className="mx-auto mt-12 max-w-2xl text-center">
                <p className="text-lg italic leading-relaxed text-[#010101]">« {testimonial.quote} »</p>
                <footer className="mt-3 text-sm font-semibold text-[#595959]">
                  {testimonial.author}
                  {testimonial.role ? ` — ${testimonial.role}` : ""}
                </footer>
              </blockquote>
            )}
          </div>
        </section>
      )}

      {content.faq.length > 0 && (
        <section className="py-14 md:py-20">
          <div className="container mx-auto max-w-3xl px-4 md:px-6 lg:px-8">
            <h2 className="text-center text-3xl font-extrabold tracking-tight text-[#010101]">Questions fréquentes</h2>
            <div className="mt-8 space-y-3">
              {content.faq.map((item) => (
                <details key={item.question} className="group rounded-2xl border border-[#E3E8F0] bg-white px-5 py-4 shadow-sm">
                  <summary className="cursor-pointer list-none font-bold text-[#010101] marker:hidden">
                    {item.question}
                  </summary>
                  <p className="mt-2 text-sm leading-relaxed text-[#595959]">{item.answer}</p>
                </details>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="bg-gradient-to-br from-[#0175BA] to-[#0471B3] py-14 text-center text-white">
        <div className="container mx-auto px-4 md:px-6 lg:px-8">
          <h2 className="text-3xl font-extrabold tracking-tight">Prêt à savoir ce qui freine votre site ?</h2>
          <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <a
              href="#formulaire"
              data-track-cta="landing_footer_form"
              className="inline-flex items-center justify-center rounded-xl bg-[#E23944] px-6 py-3.5 text-base font-bold text-white hover:bg-[#C92F3A]"
            >
              Recevoir mon audit gratuit
            </a>
            <LandingWhatsappButton trackId="landing_footer_whatsapp" />
          </div>
          <p className="mt-8 text-xs text-white/70">© SD CREATIV — Agence web</p>
        </div>
      </section>

      {/* Barre d'action fixe sur mobile : les deux conversions toujours à portée de pouce. */}
      <div className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-2 gap-2 border-t border-[#E3E8F0] bg-white/95 p-3 backdrop-blur md:hidden">
        <a
          href="#formulaire"
          data-track-cta="landing_sticky_form"
          className="flex items-center justify-center rounded-xl bg-[#E23944] px-3 py-3 text-sm font-bold text-white"
        >
          Audit gratuit
        </a>
        <LandingWhatsappButton label="WhatsApp" trackId="landing_sticky_whatsapp" className="px-3 py-3 text-sm shadow-none" />
      </div>
    </div>
  );
}
