/** Marques de la stack interne SD CREATIV — à ne pas afficher sur le site public. */
const INTERNAL_STACK_NAMES = new Set([
  "next.js",
  "nextjs",
  "next",
  "typescript",
  "postgresql",
  "postgres",
  "redis",
  "docker",
  "tailwind",
  "tailwind css",
  "framer motion",
  "sentry",
  "playwright",
  "turbopack",
  "sharp",
]);

export function isInternalStackName(name: string): boolean {
  const normalized = name.trim().toLowerCase().replace(/\s+/g, " ");
  if (INTERNAL_STACK_NAMES.has(normalized)) return true;
  return INTERNAL_STACK_NAMES.has(normalized.replace(/\.js$/, "js"));
}

export function hideInternalStackPartners<T extends { name: string }>(
  partners: T[],
): T[] {
  return partners.filter((partner) => !isInternalStackName(partner.name));
}
