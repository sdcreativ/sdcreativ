/**
 * Intention commerciale d'un message adressé à Nari (pur) : déclenche la proposition
 * « Un conseiller vous recontacte ? » et sert de priorité dans le CRM.
 */
export const CHAT_INTENTS = ["devis", "rdv", "humain", "prix"] as const;
export type ChatIntent = (typeof CHAT_INTENTS)[number];

export const CHAT_INTENT_LABELS: Record<ChatIntent, string> = {
  devis: "Demande de devis",
  rdv: "Rendez-vous / rappel",
  humain: "Veut un conseiller",
  prix: "Question de prix",
};

const PATTERNS: Array<[ChatIntent, RegExp]> = [
  ["humain", /\b(conseill|humain|quelqu'?un|une personne|parler (a|avec)|appel(ez|er)?[- ]moi|rappel|joindre|talk to|human|advisor|call me|someone)/],
  ["rdv", /\b(rendez[- ]vous|rdv|rencontr|reunion|disponibilit|creneau|book|meeting|appointment)/],
  ["devis", /\b(devis|projet|cahier des charges|proposition|quote|estimate|proposal|commencer|lancer)/],
  ["prix", /\b(prix|tarif|cout|combien|budget|fcfa|cfa|euros?|price|pricing|cost|how much)\b/],
];

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/’/g, "'");
}

export function detectChatIntent(message: string): ChatIntent | null {
  const text = normalize(message);
  for (const [intent, pattern] of PATTERNS) if (pattern.test(text)) return intent;
  return null;
}
