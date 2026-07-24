import { describe, expect, it } from "vitest";
import { allowLocaleStaticSeed } from "@/lib/cms-locale";

describe("allowLocaleStaticSeed", () => {
  it("refuse toujours le seed FR sur locale=en", () => {
    expect(allowLocaleStaticSeed("en")).toBe(false);
  });
});
