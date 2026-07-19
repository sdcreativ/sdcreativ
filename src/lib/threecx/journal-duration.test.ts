import { describe, expect, it } from "vitest";
import { parseDurationSec } from "@/lib/threecx/journal";

describe("parseDurationSec", () => {
  it("parse hh:mm:ss 3CX", () => {
    expect(parseDurationSec("00:01:35")).toBe(95);
    expect(parseDurationSec("01:00:00")).toBe(3600);
  });

  it("parse secondes", () => {
    expect(parseDurationSec(95)).toBe(95);
    expect(parseDurationSec("42")).toBe(42);
  });

  it("rejette les valeurs invalides", () => {
    expect(parseDurationSec("abc")).toBeNull();
    expect(parseDurationSec(null)).toBeNull();
  });
});
