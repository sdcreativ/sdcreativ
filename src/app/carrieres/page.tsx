import Link from "next/link";
import { Suspense } from "react";
import { CheckCircle2, Briefcase, MapPin, Users } from "lucide-react";
import { SitePageHero } from "@/components/ui/SitePageHero";
import { Button } from "@/components/ui/Button";
import { CarriereForm } from "@/components/forms/CarriereForm";
import { getCareerBenefits, getJobOffers, getJobSelectOptions } from "@/lib/public-careers-resolver";
import { createMetadata } from "@/lib/metadata";

export const metadata = createMetadata({
  title: "Carrières",
  description:
    "Rejoignez SD CREATIV : recrutement commerciaux terrain à Abidjan et en Côte d'Ivoire. Postulez en ligne.",
  path: "/carrieres",
});

export default async function CarrieresPage() {
  const [careerBenefits, jobOffers, jobSelectOptions] = await Promise.all([
    getCareerBenefits(),
    getJobOffers(),
    getJobSelectOptions(),
  ]);

  return (
    <>
      <SitePageHero pageKey="carrieres" />

      <section className="py-16 md:py-20">
        <div className="container mx-auto px-4 md:px-6 lg:px-8">
          <div className="mb-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {careerBenefits.map((benefit) => (
              <div
                key={benefit}
                className="flex items-start gap-3 rounded-xl border border-gray/60 bg-white p-4 text-sm"
              >
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
                {benefit}
              </div>
            ))}
          </div>

          <h2 className="mb-8 text-2xl font-bold text-foreground">Offres ouvertes</h2>
          <div className="space-y-8">
            {jobOffers.map((job) => (
              <article
                key={job.id}
                id={job.id}
                className="scroll-mt-28 rounded-2xl border border-gray/60 bg-white p-8 shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-primary">
                      {job.department} · {job.type}
                    </p>
                    <h3 className="mt-2 text-xl font-bold text-foreground">{job.title}</h3>
                    <p className="mt-2 flex items-center gap-1.5 text-sm text-gray-text">
                      <MapPin className="h-4 w-4 shrink-0" aria-hidden />
                      {job.location}
                    </p>
                  </div>
                  <Button href={`/carrieres?poste=${job.id}#candidature`} size="sm">
                    Postuler
                  </Button>
                </div>
                <p className="mt-4 text-gray-text">{job.description}</p>
                <div className="mt-6 grid gap-6 md:grid-cols-2">
                  <div>
                    <h4 className="flex items-center gap-2 font-bold text-foreground">
                      <Briefcase className="h-4 w-4 text-primary" aria-hidden />
                      Missions
                    </h4>
                    <ul className="mt-3 space-y-2">
                      {job.missions.map((m) => (
                        <li key={m} className="text-sm text-gray-text">
                          · {m}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h4 className="flex items-center gap-2 font-bold text-foreground">
                      <Users className="h-4 w-4 text-primary" aria-hidden />
                      Profil recherché
                    </h4>
                    <ul className="mt-3 space-y-2">
                      {job.profile.map((p) => (
                        <li key={p} className="text-sm text-gray-text">
                          · {p}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section
        id="candidature"
        className="scroll-mt-28 border-t border-gray/40 bg-gray-light py-20 md:py-28"
      >
        <div className="container mx-auto max-w-3xl px-4 md:px-6 lg:px-8">
          <Suspense fallback={<p className="text-center text-gray-text">Chargement…</p>}>
            <CarriereForm jobSelectOptions={jobSelectOptions} />
          </Suspense>
          <p className="mt-8 text-center text-sm text-gray-text">
            Une question ?{" "}
            <Link href="/contact" className="font-semibold text-primary hover:underline">
              Contactez-nous →
            </Link>
          </p>
        </div>
      </section>
    </>
  );
}
