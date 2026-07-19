import { describe, expect, it } from "vitest";
import {
  isThreeCxBusinessHours,
  resolvePublicCommsMode,
  THREECX_TIMEZONE,
  THREECX_UX_MODE,
} from "@/lib/threecx/cadrage";

/** Construit une Date dont l’heure locale Abidjan correspond aux args. */
function abidjanDate(opts: {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute?: number;
}): Date {
  const minute = opts.minute ?? 0;
  const iso = `${opts.year}-${String(opts.month).padStart(2, "0")}-${String(opts.day).padStart(2, "0")}T${String(opts.hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00`;
  // Interprétation via format inverse : on ancre sur un instant UTC puis on ajuste.
  // Plus simple : utiliser une date UTC connue pour Abidjan (UTC+0 toute l’année).
  return new Date(`${iso}+00:00`);
}

describe("threecx cadrage Phase 0", () => {
  it("expose Option A (hours_split)", () => {
    expect(THREECX_UX_MODE).toBe("hours_split");
    expect(THREECX_TIMEZONE).toBe("Africa/Abidjan");
  });

  it("détecte les heures ouvrées lun–ven 8h–18h Abidjan", () => {
    // 2026-07-20 = lundi
    expect(isThreeCxBusinessHours(abidjanDate({ year: 2026, month: 7, day: 20, hour: 8 }))).toBe(
      true,
    );
    expect(isThreeCxBusinessHours(abidjanDate({ year: 2026, month: 7, day: 20, hour: 17, minute: 59 }))).toBe(
      true,
    );
    expect(isThreeCxBusinessHours(abidjanDate({ year: 2026, month: 7, day: 20, hour: 18 }))).toBe(
      false,
    );
    expect(isThreeCxBusinessHours(abidjanDate({ year: 2026, month: 7, day: 20, hour: 7, minute: 59 }))).toBe(
      false,
    );
  });

  it("ferme le week-end", () => {
    // 2026-07-18 = samedi, 2026-07-19 = dimanche
    expect(isThreeCxBusinessHours(abidjanDate({ year: 2026, month: 7, day: 18, hour: 10 }))).toBe(
      false,
    );
    expect(isThreeCxBusinessHours(abidjanDate({ year: 2026, month: 7, day: 19, hour: 10 }))).toBe(
      false,
    );
  });

  it("Option A Phase 7 : 3CX en heures ouvrées + IA toujours (coexistence)", () => {
    const open = resolvePublicCommsMode(
      abidjanDate({ year: 2026, month: 7, day: 20, hour: 10 }),
    );
    expect(open).toEqual({
      showThreeCx: true,
      showAiAssistant: true,
      reason: "business_hours",
    });

    const closed = resolvePublicCommsMode(
      abidjanDate({ year: 2026, month: 7, day: 20, hour: 20 }),
    );
    expect(closed).toEqual({
      showThreeCx: false,
      showAiAssistant: true,
      reason: "after_hours",
    });
  });
});
