import { z } from "zod";
import { CHATBOT } from "@/lib/constants";

/**
 * Apparence de Kady (assistance virtuelle du site) — pur, partagé site / admin / API.
 * Réglée dans CRM → Site → Kady ; les valeurs par défaut reproduisent le widget d'origine.
 */
export const KADY_POSITIONS = ["left", "right"] as const;
export const KADY_LAUNCHER_STYLES = ["avatar", "icon"] as const;
export const KADY_LAUNCHER_ICONS = ["message-circle", "messages-square", "bot", "sparkles", "headphones", "help-circle"] as const;
export const KADY_LAUNCHER_ANIMATIONS = ["none", "pulse", "bounce", "wiggle"] as const;
export const KADY_PANEL_ANIMATIONS = ["slide-up", "fade", "scale", "none"] as const;
export const KADY_FONTS = ["site", "system", "rounded", "serif", "mono"] as const;

export type KadyPosition = (typeof KADY_POSITIONS)[number];
export type KadyLauncherIcon = (typeof KADY_LAUNCHER_ICONS)[number];
export type KadyFont = (typeof KADY_FONTS)[number];

export const KADY_POSITION_LABELS: Record<KadyPosition, string> = { left: "En bas à gauche", right: "En bas à droite" };
export const KADY_LAUNCHER_STYLE_LABELS: Record<(typeof KADY_LAUNCHER_STYLES)[number], string> = {
  avatar: "Photo",
  icon: "Icône",
};
export const KADY_LAUNCHER_ICON_LABELS: Record<KadyLauncherIcon, string> = {
  "message-circle": "Bulle",
  "messages-square": "Conversation",
  bot: "Robot",
  sparkles: "Étincelles",
  headphones: "Casque",
  "help-circle": "Aide",
};
export const KADY_LAUNCHER_ANIMATION_LABELS: Record<(typeof KADY_LAUNCHER_ANIMATIONS)[number], string> = {
  none: "Aucune",
  pulse: "Halo pulsé",
  bounce: "Rebond",
  wiggle: "Balancement",
};
export const KADY_PANEL_ANIMATION_LABELS: Record<(typeof KADY_PANEL_ANIMATIONS)[number], string> = {
  "slide-up": "Glisse vers le haut",
  fade: "Fondu",
  scale: "Zoom",
  none: "Aucune",
};
export const KADY_FONT_LABELS: Record<KadyFont, string> = {
  site: "Police du site (Poppins)",
  system: "Système (lisible partout)",
  rounded: "Arrondie",
  serif: "Serif (élégante)",
  mono: "Monospace",
};

/** Piles de polices sans téléchargement supplémentaire (aucun impact sur le chargement de la page). */
export const KADY_FONT_STACKS: Record<KadyFont, string> = {
  site: "var(--font-poppins), system-ui, sans-serif",
  system: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
  rounded: "ui-rounded, 'SF Pro Rounded', 'Hiragino Maru Gothic ProN', 'Arial Rounded MT Bold', system-ui, sans-serif",
  serif: "Georgia, 'Times New Roman', serif",
  mono: "ui-monospace, 'SF Mono', Menlo, Consolas, monospace",
};

const hex = z
  .string()
  .trim()
  .regex(/^#[0-9a-fA-F]{6}$/, "Couleur au format #RRGGBB.")
  .transform((v) => v.toUpperCase());

/** Photo : chemin du site (/images/…) ou URL https (média importé). */
const avatarUrl = z
  .string()
  .trim()
  .max(500)
  .refine((v) => v.startsWith("/") || /^https:\/\//.test(v), "Photo : chemin du site ou URL https.");

export const kadyAppearanceSchema = z.object({
  name: z.string().trim().min(2, "Le nom doit contenir au moins 2 caractères.").max(30),
  roleFr: z.string().trim().min(2).max(60),
  roleEn: z.string().trim().min(2).max(60),
  /** Message d'accueil ; vide = message par défaut (avec le nom). */
  greetingFr: z.string().trim().max(400),
  greetingEn: z.string().trim().max(400),
  avatarUrl,
  launcherStyle: z.enum(KADY_LAUNCHER_STYLES),
  launcherIcon: z.enum(KADY_LAUNCHER_ICONS),
  showNameOnLauncher: z.boolean(),
  position: z.enum(KADY_POSITIONS),
  launcherSize: z.number().int().min(48).max(72),
  launcherAnimation: z.enum(KADY_LAUNCHER_ANIMATIONS),
  panelAnimation: z.enum(KADY_PANEL_ANIMATIONS),
  font: z.enum(KADY_FONTS),
  fontSize: z.number().int().min(12).max(18),
  colors: z.object({
    /** Bouton d'ouverture, messages du visiteur, bouton Envoyer. */
    accent: hex,
    accentText: hex,
    headerBg: hex,
    headerText: hex,
    botBubble: hex,
    botText: hex,
    panelBg: hex,
  }),
});
export type KadyAppearance = z.infer<typeof kadyAppearanceSchema>;

export const DEFAULT_KADY_APPEARANCE: KadyAppearance = {
  name: CHATBOT.name,
  roleFr: CHATBOT.roleFr,
  roleEn: CHATBOT.roleEn,
  greetingFr: "",
  greetingEn: "",
  avatarUrl: CHATBOT.avatarSrc,
  launcherStyle: "avatar",
  launcherIcon: "message-circle",
  showNameOnLauncher: true,
  position: "left",
  launcherSize: 56,
  launcherAnimation: "none",
  panelAnimation: "slide-up",
  font: "site",
  fontSize: 14,
  colors: {
    accent: "#0072B5",
    accentText: "#FFFFFF",
    headerBg: "#0A1628",
    headerText: "#FFFFFF",
    botBubble: "#F5F7FA",
    botText: "#0A0A0A",
    panelBg: "#FFFFFF",
  },
};

/** Réglages enregistrés (éventuellement partiels ou anciens) complétés par les valeurs par défaut. */
export function mergeKadyAppearance(raw: unknown): KadyAppearance {
  if (!raw || typeof raw !== "object") return DEFAULT_KADY_APPEARANCE;
  const value = raw as Partial<KadyAppearance>;
  const merged = {
    ...DEFAULT_KADY_APPEARANCE,
    ...value,
    colors: { ...DEFAULT_KADY_APPEARANCE.colors, ...(value.colors ?? {}) },
  };
  const parsed = kadyAppearanceSchema.safeParse(merged);
  return parsed.success ? parsed.data : DEFAULT_KADY_APPEARANCE;
}

/** Remplace le prénom par défaut par le nom choisi (prompts, réponses de la base de connaissances). */
export function withAssistantName(text: string, name: string): string {
  if (!name || name === CHATBOT.name) return text;
  return text.replace(new RegExp(`\\b${CHATBOT.name}\\b`, "g"), name);
}

function luminance(color: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(color.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Rapport de contraste WCAG entre deux couleurs #RRGGBB (1 à 21). */
export function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

/** Paires texte / fond lisibles en dessous de 4,5:1 (seuil WCAG AA) — signalées dans l'admin. */
export function kadyContrastWarnings(appearance: KadyAppearance): string[] {
  const { colors } = appearance;
  const pairs: Array<[string, string, string]> = [
    ["Bouton et messages du visiteur", colors.accentText, colors.accent],
    ["En-tête", colors.headerText, colors.headerBg],
    ["Messages de l'assistante", colors.botText, colors.botBubble],
  ];
  return pairs
    .filter(([, text, bg]) => contrastRatio(text, bg) < 4.5)
    .map(([label, text, bg]) => `${label} : contraste ${contrastRatio(text, bg).toFixed(1)}:1 (4,5:1 recommandé).`);
}
