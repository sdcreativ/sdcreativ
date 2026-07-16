import { describe, expect, it } from "vitest";
import {
  extractEmailAddress,
  normalizeMailSubject,
  parseMessageIdList,
  snippetFromBody,
  uniqueEmails,
} from "@/lib/mail/threading";

describe("normalizeMailSubject", () => {
  it("retire les préfixes Re:/Fwd: répétés", () => {
    expect(normalizeMailSubject("Re: Re: Devis site")).toBe("devis site");
    expect(normalizeMailSubject("FWD: Aw: Hello")).toBe("hello");
  });

  it("normalise les espaces", () => {
    expect(normalizeMailSubject("  Bonjour   monde  ")).toBe("bonjour monde");
  });
});

describe("extractEmailAddress / uniqueEmails", () => {
  it("extrait l’adresse depuis un display-name", () => {
    expect(extractEmailAddress("Jean Dupont <jean@example.com>")).toBe(
      "jean@example.com",
    );
  });

  it("déduplique et ignore les valeurs invalides", () => {
    expect(
      uniqueEmails([
        "A <a@example.com>",
        "a@example.com",
        "not-an-email",
        "B <b@example.com>",
      ]),
    ).toEqual(["a@example.com", "b@example.com"]);
  });
});

describe("parseMessageIdList", () => {
  it("parse References en liste d’ids", () => {
    expect(
      parseMessageIdList("<one@x> <two@x> junk <three@x>"),
    ).toEqual(["<one@x>", "<two@x>", "<three@x>"]);
  });

  it("retourne [] si vide", () => {
    expect(parseMessageIdList(null)).toEqual([]);
    expect(parseMessageIdList("")).toEqual([]);
  });
});

describe("snippetFromBody", () => {
  it("tronque avec ellipse", () => {
    const long = "a".repeat(200);
    const snippet = snippetFromBody(long, 20);
    expect(snippet.length).toBe(20);
    expect(snippet.endsWith("…")).toBe(true);
  });
});
