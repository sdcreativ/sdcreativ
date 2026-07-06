import { services } from "@/content/services";

export const serviceSelectOptions = services.map(({ id, title }) => ({
  value: id,
  label: title,
}));

export function getServiceLabel(serviceId: string): string {
  return services.find((s) => s.id === serviceId)?.title ?? serviceId;
}

export const budgetOptions = [
  { value: "moins-500k", label: "Moins de 500 000 FCFA" },
  { value: "500k-1m", label: "500 000 – 1 000 000 FCFA" },
  { value: "1m-2m", label: "1 000 000 – 2 000 000 FCFA" },
  { value: "2m-5m", label: "2 000 000 – 5 000 000 FCFA" },
  { value: "plus-5m", label: "Plus de 5 000 000 FCFA" },
  { value: "inconnu", label: "Je ne sais pas encore" },
] as const;

export const timelineOptions = [
  { value: "urgent", label: "Urgent (moins d'1 mois)" },
  { value: "1-2-mois", label: "1 à 2 mois" },
  { value: "2-3-mois", label: "2 à 3 mois" },
  { value: "3-plus", label: "Plus de 3 mois" },
  { value: "flexible", label: "Flexible / à définir" },
] as const;

export function getBudgetLabel(value: string): string {
  return budgetOptions.find((o) => o.value === value)?.label ?? value;
}

export function getTimelineLabel(value: string): string {
  return timelineOptions.find((o) => o.value === value)?.label ?? value;
}
