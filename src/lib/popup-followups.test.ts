import { afterEach, describe, expect, it, vi } from "vitest";
import { dueReminderStage, pickPopupForVisitor, updateSitePopupSchema } from "@/lib/site-popups-types";
import { signUnsubscribeToken, unsubscribeFooterHtml, unsubscribeLinks, verifyUnsubscribeToken } from "@/lib/email-unsubscribe";
import { buildPopupReminderEmail } from "@/lib/popup-reminders";
import type { PopupSignup } from "@/lib/site-popups";

const popup = (name: string, abTestKey: string | null, includePaths: string[] = []) => ({
  name,
  abTestKey,
  includePaths,
  excludePaths: [] as string[],
});

describe("test A/B", () => {
  const a = popup("A", "offre");
  const b = popup("B", "offre");
  const other = popup("Autre", null);

  it("répartit les visiteurs selon leur seau, toujours la même version pour un seau", () => {
    expect(pickPopupForVisitor([a, b, other], "/tarifs", 0)).toBe(a);
    expect(pickPopupForVisitor([a, b, other], "/tarifs", 1)).toBe(b);
    expect(pickPopupForVisitor([a, b, other], "/tarifs", 42)).toBe(a);
    expect(pickPopupForVisitor([a, b, other], "/tarifs", 43)).toBe(b);
  });

  it("sans clé : 1er popup qui correspond à la page", () => {
    expect(pickPopupForVisitor([other, a, b], "/tarifs", 1)).toBe(other);
  });

  it("une version ciblée sur d'autres pages n'entre pas dans la répartition", () => {
    const bElsewhere = popup("B", "offre", ["/blog"]);
    expect(pickPopupForVisitor([a, bElsewhere], "/tarifs", 1)).toBe(a);
    expect(pickPopupForVisitor([a, b], "/admin/crm", 0)).toBeNull();
  });

  it("normalise la clé de test et refuse les caractères spéciaux", () => {
    expect(updateSitePopupSchema.parse({ abTestKey: "Offre-Juin" }).abTestKey).toBe("offre-juin");
    expect(updateSitePopupSchema.parse({ abTestKey: "" }).abTestKey).toBeNull();
    expect(updateSitePopupSchema.safeParse({ abTestKey: "offre juin!" }).success).toBe(false);
  });
});

describe("relances J+3 / J+20", () => {
  const day = 86_400_000;
  const created = Date.parse("2026-10-01T10:00:00Z");
  const signup = (reminderCount: number, validDays = 30) => ({
    createdAt: new Date(created).toISOString(),
    codeExpiresAt: new Date(created + validDays * day).toISOString(),
    reminderCount,
  });

  it("rien avant J+3, puis 1re relance, puis 2e à J+20", () => {
    expect(dueReminderStage(signup(0), created + 2 * day)).toBeNull();
    expect(dueReminderStage(signup(0), created + 3 * day)).toEqual({ stage: 0, nextCount: 1 });
    expect(dueReminderStage(signup(1), created + 10 * day)).toBeNull();
    expect(dueReminderStage(signup(1), created + 20 * day)).toEqual({ stage: 1, nextCount: 2 });
    expect(dueReminderStage(signup(2), created + 25 * day)).toBeNull();
  });

  it("inscrit ancien jamais relancé : une seule relance (la dernière)", () => {
    expect(dueReminderStage(signup(0), created + 22 * day)).toEqual({ stage: 1, nextCount: 2 });
  });

  it("pas de relance pour un code qui expire dans moins d'un jour", () => {
    expect(dueReminderStage(signup(0, 4), created + 3.5 * day)).toBeNull();
  });
});

describe("désinscription", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("jeton signé : aller-retour, insensible à la casse, falsification refusée", () => {
    vi.stubEnv("ADMIN_SECRET", "s".repeat(32));
    const token = signUnsubscribeToken("Awa@Exemple.ci")!;
    expect(verifyUnsubscribeToken(token)).toBe("awa@exemple.ci");
    const [encoded] = token.split(".");
    const forged = `${Buffer.from("autre@exemple.ci").toString("base64url")}.${token.split(".")[1]}`;
    expect(verifyUnsubscribeToken(forged)).toBeNull();
    expect(verifyUnsubscribeToken(`${encoded}.abc`)).toBeNull();
    expect(verifyUnsubscribeToken(null)).toBeNull();
  });

  it("un jeton signé avec un autre secret est refusé", () => {
    vi.stubEnv("ADMIN_SECRET", "a".repeat(32));
    const token = signUnsubscribeToken("awa@exemple.ci")!;
    vi.stubEnv("ADMIN_SECRET", "b".repeat(32));
    expect(verifyUnsubscribeToken(token)).toBeNull();
  });

  it("liens page + un clic, pied d'e-mail FR / EN", () => {
    vi.stubEnv("ADMIN_SECRET", "s".repeat(32));
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://sdcreativ.com/");
    const links = unsubscribeLinks("awa@exemple.ci")!;
    expect(links.pageUrl).toMatch(/^https:\/\/sdcreativ\.com\/desinscription\?t=/);
    expect(links.oneClickUrl).toMatch(/^https:\/\/sdcreativ\.com\/api\/public\/unsubscribe\?t=/);
    expect(unsubscribeFooterHtml(links.pageUrl)).toContain("Se désinscrire");
    expect(unsubscribeFooterHtml(links.pageUrl, "en")).toContain("Unsubscribe");
  });
});

describe("e-mail de relance", () => {
  const signup = {
    name: "Awa <b>",
    code: "SDC-AWA-7K2Q",
    offerLabel: "Maintenance de la 2e année à -50 %",
    locale: "fr",
    codeExpiresAt: "2026-10-31T10:00:00.000Z",
  } as PopupSignup;
  const now = Date.parse("2026-10-21T10:00:00Z");

  it("J+3 : rappel du code, lien devis prérempli, nom échappé", () => {
    const { subject, html } = buildPopupReminderEmail(signup, 0, now);
    expect(subject).toBe("Votre code SDC-AWA-7K2Q vous attend");
    expect(html).toContain("/devis?code=SDC-AWA-7K2Q");
    expect(html).toContain("Awa &lt;b&gt;");
  });

  it("J+20 : jours restants", () => {
    expect(buildPopupReminderEmail(signup, 1, now).subject).toBe("Plus que 10 jours pour utiliser votre code SDC-AWA-7K2Q");
    expect(buildPopupReminderEmail({ ...signup, locale: "en" }, 1, now).subject).toBe("10 days left to use your code SDC-AWA-7K2Q");
  });
});
