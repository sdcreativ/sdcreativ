import { jobOffers as staticJobOffers } from "@/content/carrieres";
import { isDatabaseConfigured } from "@/lib/db";
import { listPublicJobOffers } from "@/lib/public-job-offers";
import { getSiteCareersSettings } from "@/lib/site-careers-settings";
import { allowStaticContentFallback } from "@/lib/static-content-fallback";

export type ResolvedJobOffer = {
  id: string;
  title: string;
  type: string;
  location: string;
  department: string;
  description: string;
  missions: string[];
  profile: string[];
};

function recordToJob(record: Awaited<ReturnType<typeof listPublicJobOffers>>[number]): ResolvedJobOffer {
  return {
    id: record.slug,
    title: record.title,
    type: record.type,
    location: record.location,
    department: record.department,
    description: record.description,
    missions: record.missions,
    profile: record.profile,
  };
}

export async function getJobOffers(): Promise<ResolvedJobOffer[]> {
  if (!isDatabaseConfigured()) {
    return allowStaticContentFallback() ? staticJobOffers : [];
  }

  try {
    const records = await listPublicJobOffers({ visibleOnly: true });
    if (records.length > 0) return records.map(recordToJob);
  } catch (error) {
    console.error("[public-job-offers] getJobOffers fallback:", error);
  }

  return allowStaticContentFallback() ? staticJobOffers : [];
}

export async function getJobOffer(id: string): Promise<ResolvedJobOffer | undefined> {
  const jobs = await getJobOffers();
  return jobs.find((job) => job.id === id);
}

export async function getCareerBenefits(): Promise<string[]> {
  const settings = await getSiteCareersSettings();
  return [...settings.benefits];
}

export async function getJobSelectOptions(): Promise<{ value: string; label: string }[]> {
  const jobs = await getJobOffers();
  return [
    ...jobs.map((job) => ({ value: job.id, label: job.title })),
    { value: "candidature-spontanee", label: "Candidature spontanée" },
  ];
}

export async function getJobLabel(id: string): Promise<string> {
  const options = await getJobSelectOptions();
  return options.find((o) => o.value === id)?.label ?? id;
}
