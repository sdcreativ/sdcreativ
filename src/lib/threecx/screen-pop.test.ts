import { describe, expect, it } from "vitest";
import { THREECX_PME_SCREEN_POP_URL } from "@/lib/threecx/screen-pop";

describe("threecx screen-pop Phase 4 PME", () => {
  it("expose l’URL console 3CX avec variables Caller*", () => {
    expect(THREECX_PME_SCREEN_POP_URL).toContain("/admin/crm/3cx-pop");
    expect(THREECX_PME_SCREEN_POP_URL).toContain("%CallerNumber%");
    expect(THREECX_PME_SCREEN_POP_URL).toContain("%CallerDisplayName%");
  });
});
