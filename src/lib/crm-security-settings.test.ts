import { describe, expect, it } from "vitest";
import { DEFAULT_CRM_SECURITY, securitySchema } from "@/lib/crm-security-settings";

describe("crm security settings", () => {
  it("accepte idleTimeoutMinutes dont 0 (désactivé)", () => {
    expect(securitySchema.parse({ idleTimeoutMinutes: 0 }).idleTimeoutMinutes).toBe(0);
    expect(securitySchema.parse({ idleTimeoutMinutes: 45 }).idleTimeoutMinutes).toBe(45);
  });

  it("rejette une valeur hors bornes", () => {
    expect(securitySchema.safeParse({ idleTimeoutMinutes: -1 }).success).toBe(false);
    expect(securitySchema.safeParse({ idleTimeoutMinutes: 500 }).success).toBe(false);
  });

  it("définit un défaut d’inactivité", () => {
    expect(DEFAULT_CRM_SECURITY.idleTimeoutMinutes).toBe(30);
  });
});
