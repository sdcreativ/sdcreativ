/** Utilitaires OTP email sans dépendance serveur — sûrs pour les Client Components. */

export function normalizeLoginEmailOtp(input: string): string | null {
  const cleaned = input.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
  let suffix: string;

  if (cleaned.startsWith("SD") && cleaned.length >= 8) {
    suffix = cleaned.slice(2, 8);
  } else if (cleaned.length === 6) {
    suffix = cleaned;
  } else {
    return null;
  }

  if (!/^[A-Z2-9]{6}$/.test(suffix) || /[01IO]/.test(suffix)) {
    return null;
  }

  return `SD-${suffix}`;
}
