/** Normalisation téléphone pour matching 3CX ↔ CRM. */

export function digitsOnly(raw: string | null | undefined): string | null {
  if (!raw?.trim()) return null;
  const digits = raw.replace(/\D/g, "");
  return digits.length >= 8 ? digits : null;
}

/**
 * Variantes de matching CI / international :
 * - digits complets
 * - sans indicatif 225
 * - avec 225 si numéro local 8–10 digits
 */
export function phoneMatchVariants(raw: string | null | undefined): string[] {
  const digits = digitsOnly(raw);
  if (!digits) return [];

  const variants = new Set<string>([digits]);

  if (digits.startsWith("225") && digits.length > 11) {
    variants.add(digits.slice(3));
  } else if (digits.length >= 8 && digits.length <= 10) {
    variants.add(`225${digits}`);
  }

  // 00xx…
  if (digits.startsWith("00") && digits.length > 10) {
    variants.add(digits.slice(2));
  }

  return [...variants];
}
