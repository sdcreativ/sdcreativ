import { hasServiceDetail } from "@/content/service-details";
import { services, type Service } from "@/content/services";

export function getService(id: string): Service | undefined {
  return services.find((s) => s.id === id);
}

/** Lien vers la fiche détaillée, une page dédiée existante ou l'ancre sur le hub. */
export function getServiceHref(service: Service): string {
  if (service.detailHref) return service.detailHref;
  if (hasServiceDetail(service.id)) return `/services/${service.id}`;
  return `/contact?service=${service.id}`;
}

export function getServiceHubLinkLabel(service: Service): string {
  if (service.detailHref || hasServiceDetail(service.id)) {
    return service.detailLabel ?? "Découvrir le service";
  }
  return "Demander un devis";
}
