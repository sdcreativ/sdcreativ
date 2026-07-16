import { describe, expect, it } from "vitest";
import { normalizeMatchEmail } from "@/lib/mail/matching";

describe("normalizeMatchEmail", () => {
  it("normalise la casse", () => {
    expect(normalizeMatchEmail("Jean.Dupont@Example.COM")).toBe(
      "jean.dupont@example.com",
    );
  });

  it("extrait depuis display-name", () => {
    expect(normalizeMatchEmail("Jean <jean@example.com>")).toBe("jean@example.com");
  });

  it("retire l’alias +tag", () => {
    expect(normalizeMatchEmail("user+newsletter@example.com")).toBe(
      "user@example.com",
    );
    expect(normalizeMatchEmail("User+CRM+Tag@Example.com")).toBe("user@example.com");
  });

  it("conserve le domaine", () => {
    expect(normalizeMatchEmail("a+b@sous.domaine.fr")).toBe("a@sous.domaine.fr");
  });

  it("retourne null si invalide", () => {
    expect(normalizeMatchEmail("")).toBeNull();
    expect(normalizeMatchEmail("pas-un-email")).toBeNull();
    expect(normalizeMatchEmail("@nodomain")).toBeNull();
  });
});
