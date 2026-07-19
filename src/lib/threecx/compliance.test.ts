import { describe, expect, it } from "vitest";
import {
  assertThreeCxServerSecrets,
  getThreeCxRecordingNoticeFr,
  isThreeCxRecordingNoticeEnabled,
  THREECX_RGPD_CHECKLIST,
} from "@/lib/threecx/compliance";

describe("threecx compliance Phase 8", () => {
  it("expose une checklist RGPD non vide", () => {
    expect(THREECX_RGPD_CHECKLIST.length).toBeGreaterThanOrEqual(5);
  });

  it("notice enregistrement selon le flag public", () => {
    expect(isThreeCxRecordingNoticeEnabled({ NEXT_PUBLIC_THREE_CX_RECORDING_NOTICE: "true" })).toBe(
      true,
    );
    expect(getThreeCxRecordingNoticeFr({ NEXT_PUBLIC_THREE_CX_RECORDING_NOTICE: "false" })).toBeNull();
    expect(
      getThreeCxRecordingNoticeFr({ NEXT_PUBLIC_THREE_CX_RECORDING_NOTICE: "1" }),
    ).toMatch(/enregistr/i);
  });

  it("détecte un token CRM exposé en NEXT_PUBLIC_*", () => {
    expect(
      assertThreeCxServerSecrets({
        THREE_CX_CRM_TOKEN: "secret-xyz",
        NEXT_PUBLIC_THREE_CX_CRM_TOKEN: "secret-xyz",
      }),
    ).toContain("NEXT_PUBLIC_THREE_CX_CRM_TOKEN");

    expect(
      assertThreeCxServerSecrets({
        THREE_CX_CRM_TOKEN: "secret-xyz",
        NEXT_PUBLIC_THREE_CX_ENABLED: "true",
      }),
    ).toEqual([]);
  });
});
