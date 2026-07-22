import type { CrmDocPageRecord } from "@/lib/crm-docs-types";

/** Champs ajoutés (vidéo / EN / analytics) pour les fallbacks catalogue. */
export function crmDocPageExtrasDefaults(): Pick<
  CrmDocPageRecord,
  | "videoUrl"
  | "titleEn"
  | "summaryEn"
  | "explanationEn"
  | "howItWorksEn"
  | "contentHtmlEn"
  | "viewCount"
> {
  return {
    videoUrl: null,
    titleEn: "",
    summaryEn: "",
    explanationEn: "",
    howItWorksEn: "",
    contentHtmlEn: "",
    viewCount: 0,
  };
}
