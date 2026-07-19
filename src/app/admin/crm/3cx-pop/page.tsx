import { redirect } from "next/navigation";
import { resolveThreeCxScreenPopUrl } from "@/lib/threecx/screen-pop";

type SearchParams = Promise<{
  phone?: string;
  name?: string;
  /** Alias si 3CX encode autrement */
  CallerNumber?: string;
  CallerDisplayName?: string;
}>;

/**
 * Point d’entrée screen-pop 3CX PME (Réglages → Intégration → CRM personnalisé).
 * Résout le contact par téléphone puis redirige vers la fiche lead/client,
 * ou ouvre la création de lead préremplie.
 */
export default async function ThreeCxScreenPopPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const phone = sp.phone ?? sp.CallerNumber ?? "";
  const name = sp.name ?? sp.CallerDisplayName ?? "";

  const target = await resolveThreeCxScreenPopUrl({ phone, name });
  redirect(target);
}
