import { describe, expect, it } from "vitest";
import { buildCrmSessionCookie, signCrmSession, verifyCrmSession } from "@/lib/crm-session";

const SECRET = "test-admin-secret-for-session-hmac";

describe("crm-session", () => {
  it("signe et vérifie une session valide", async () => {
    const exp = Date.now() + 60_000;
    const token = await signCrmSession(
      {
        userId: "user-1",
        email: "admin@sdcreativ.com",
        name: "Admin",
        role: "admin",
        exp,
      },
      SECRET,
    );
    const payload = await verifyCrmSession(token, SECRET);
    expect(payload).toMatchObject({
      userId: "user-1",
      email: "admin@sdcreativ.com",
      name: "Admin",
      role: "admin",
    });
  });

  it("rejette une signature altérée", async () => {
    const token = await signCrmSession(
      {
        userId: "user-1",
        email: "admin@sdcreativ.com",
        name: "Admin",
        role: "admin",
        exp: Date.now() + 60_000,
      },
      SECRET,
    );
    const tampered = `${token.slice(0, -4)}xxxx`;
    expect(await verifyCrmSession(tampered, SECRET)).toBeNull();
    expect(await verifyCrmSession(token, "wrong-secret")).toBeNull();
  });

  it("rejette une session expirée", async () => {
    const token = await signCrmSession(
      {
        userId: "user-1",
        email: "admin@sdcreativ.com",
        name: "Admin",
        role: "admin",
        exp: Date.now() - 1,
      },
      SECRET,
    );
    expect(await verifyCrmSession(token, SECRET)).toBeNull();
  });

  it("buildCrmSessionCookie fixe une expiration future", async () => {
    const before = Date.now();
    const cookie = await buildCrmSessionCookie(
      {
        userId: "user-1",
        email: "admin@sdcreativ.com",
        name: "Admin",
        role: "admin",
      },
      SECRET,
      3600,
    );
    expect(cookie.maxAge).toBe(3600);
    const payload = await verifyCrmSession(cookie.value, SECRET);
    expect(payload?.exp).toBeGreaterThan(before);
  });
});
