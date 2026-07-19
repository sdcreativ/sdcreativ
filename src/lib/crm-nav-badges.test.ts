import { describe, expect, it } from "vitest";
import { formatNavBadge } from "@/lib/crm-nav-badges";

describe("formatNavBadge", () => {
  it("masque les zéros", () => {
    expect(formatNavBadge(0)).toBe("");
  });

  it("affiche les compteurs normaux", () => {
    expect(formatNavBadge(1)).toBe("1");
    expect(formatNavBadge(12)).toBe("12");
  });

  it("plafonne à 99+", () => {
    expect(formatNavBadge(100)).toBe("99+");
  });
});
