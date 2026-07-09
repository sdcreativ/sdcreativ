import type { ResolvedService } from "@/lib/public-services-types";
import {
  getService as resolveService,
  getServices as resolveServices,
  hasServiceDetail as resolveHasServiceDetail,
} from "@/lib/public-services-resolver";

export type Service = ResolvedService;

export async function getServices(): Promise<Service[]> {
  return resolveServices();
}

export async function getService(id: string): Promise<Service | undefined> {
  return resolveService(id);
}

/** Lien vers la fiche détaillée, une page dédiée existante ou l'ancre sur le hub. */
export async function getServiceHref(service: Service): Promise<string> {
  if (service.detailHref) return service.detailHref;
  if (await resolveHasServiceDetail(service.id)) return `/services/${service.id}`;
  return `/contact?service=${service.id}`;
}

export async function getServiceHubLinkLabel(service: Service): Promise<string> {
  if (service.detailHref || (await resolveHasServiceDetail(service.id))) {
    return service.detailLabel ?? "Découvrir le service";
  }
  return "Demander un devis";
}

/** Sync helpers for client components that already have a service object. */
export function getServiceHrefSync(service: Service): string {
  if (service.detailHref) return service.detailHref;
  return `/services/${service.id}`;
}

export function getServiceHubLinkLabelSync(service: Service): string {
  if (service.detailHref) {
    return service.detailLabel ?? "Découvrir le service";
  }
  return service.detailLabel ?? "Découvrir le service";
}
