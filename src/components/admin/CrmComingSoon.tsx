import { Construction } from "lucide-react";

type Props = {
  title: string;
  description: string;
  /** Libellé du badge (défaut : module non prêt). */
  badge?: string;
};

export function CrmComingSoon({
  title,
  description,
  badge = "Bientôt disponible",
}: Props) {
  return (
    <div className="mx-auto flex max-w-lg flex-col items-center rounded-2xl border border-gray/40 bg-white px-8 py-16 text-center shadow-sm">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-light">
        <Construction className="h-7 w-7 text-primary" aria-hidden />
      </div>
      <h2 className="text-xl font-bold text-foreground">{title}</h2>
      <p className="mt-3 text-sm leading-relaxed text-gray-text">{description}</p>
      <p className="mt-6 rounded-full bg-gray-light px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-gray-text">
        {badge}
      </p>
    </div>
  );
}
