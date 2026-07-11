import type { ClientProfileData } from "@/lib/client-portal-config";
import { formatFcfaShort } from "@/lib/format";
import type { ProjectStep } from "@/content/client-portal-types";
import { resolvePortalProjectSteps } from "@/lib/client-portal-utils";
import { cn } from "@/lib/utils";

type Props = {
  profile: ClientProfileData;
  projectSteps?: ProjectStep[] | null;
};

export function ClientPortalProjectView({ profile, projectSteps }: Props) {
  const steps = resolvePortalProjectSteps(profile.progress, projectSteps ?? null);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <section className="overflow-hidden rounded-2xl border border-gray/40 bg-white shadow-sm">
        <div className="h-48 bg-gradient-to-br from-[#0a3d6b] via-primary to-[#38bdf8]" />
        <div className="p-6">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-primary-light px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-primary">
              {profile.projectStatus}
            </span>
            {profile.linkedToCrm && (
              <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
                Synchronisé CRM
              </span>
            )}
          </div>
          <h2 className="mt-4 text-2xl font-bold text-foreground">{profile.projectTitle}</h2>
          <p className="mt-2 text-gray-text">{profile.projectType}</p>
          <dl className="mt-6 grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl bg-gray-light/60 p-4">
              <dt className="text-xs font-medium uppercase tracking-wide text-gray-text">Début</dt>
              <dd className="mt-1 font-semibold text-foreground">{profile.startDate}</dd>
            </div>
            <div className="rounded-xl bg-gray-light/60 p-4">
              <dt className="text-xs font-medium uppercase tracking-wide text-gray-text">
                Livraison
              </dt>
              <dd className="mt-1 font-semibold text-foreground">{profile.endDate}</dd>
            </div>
            <div className="rounded-xl bg-gray-light/60 p-4">
              <dt className="text-xs font-medium uppercase tracking-wide text-gray-text">Budget</dt>
              <dd className="mt-1 font-semibold text-foreground">
                {formatFcfaShort(profile.totalAmount)} FCFA
              </dd>
            </div>
          </dl>
          <div className="mt-6">
            <div className="mb-2 flex justify-between text-sm font-medium">
              <span className="text-gray-text">Avancement</span>
              <span className="text-primary">{profile.progress} %</span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-gray-light">
              <div
                className="h-full rounded-full bg-primary"
                style={{ width: `${profile.progress}%` }}
              />
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-gray/40 bg-white p-6 shadow-sm">
        <h3 className="font-bold text-foreground">Jalons</h3>
        <ol className="mt-6 space-y-5">
          {steps.map((step) => (
            <li key={step.id} className="flex gap-4">
              <span
                className={cn(
                  "flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold",
                  step.status === "done" && "bg-emerald-100 text-emerald-700",
                  step.status === "current" && "bg-primary text-white",
                  step.status === "upcoming" && "bg-gray-light text-gray-text",
                )}
              >
                {step.status === "done" ? "✓" : step.id}
              </span>
              <div>
                <p className="font-semibold text-foreground">{step.label}</p>
                <p className="text-sm text-gray-text">
                  {step.status === "done" && "Étape validée par l'équipe et le client."}
                  {step.status === "current" && "Travaux en cours — point d'étape hebdomadaire."}
                  {step.status === "upcoming" && "Planifié après validation de l'étape précédente."}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
