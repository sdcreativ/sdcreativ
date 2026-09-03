import { describe, expect, it } from "vitest";
import {
  hideInternalStackPartners,
  isInternalStackName,
} from "@/lib/internal-stack-public";

describe("isInternalStackName", () => {
  it("masque la stack interne", () => {
    expect(isInternalStackName("Next.js")).toBe(true);
    expect(isInternalStackName("PostgreSQL")).toBe(true);
    expect(isInternalStackName("Docker")).toBe(true);
  });

  it("laisse les outils clients / partenaires", () => {
    expect(isInternalStackName("WordPress")).toBe(false);
    expect(isInternalStackName("Meta")).toBe(false);
    expect(isInternalStackName("Wave")).toBe(false);
  });
});

describe("hideInternalStackPartners", () => {
  it("filtre Next.js dans une liste mixte", () => {
    const out = hideInternalStackPartners([
      { name: "WordPress" },
      { name: "Next.js" },
      { name: "AWS" },
    ]);
    expect(out.map((p) => p.name)).toEqual(["WordPress", "AWS"]);
  });
});
