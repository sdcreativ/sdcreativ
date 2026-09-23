/** Coupure rapide du module sans retirer les routes. Activé par défaut. */
export function isBusinessCardsEnabled(): boolean {
  const flag = process.env.DIGITAL_BUSINESS_CARDS_ENABLED?.trim().toLowerCase();
  if (flag === "0" || flag === "false" || flag === "off") return false;
  return true;
}
