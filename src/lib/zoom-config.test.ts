import { describe, expect, it } from "vitest";
import { isZoomApiConfigured } from "@/lib/zoom-config";

describe("isZoomApiConfigured", () => {
  it("retourne false sans variables", () => {
    const prev = {
      account: process.env.ZOOM_ACCOUNT_ID,
      id: process.env.ZOOM_CLIENT_ID,
      secret: process.env.ZOOM_CLIENT_SECRET,
    };
    delete process.env.ZOOM_ACCOUNT_ID;
    delete process.env.ZOOM_CLIENT_ID;
    delete process.env.ZOOM_CLIENT_SECRET;
    expect(isZoomApiConfigured()).toBe(false);
    if (prev.account) process.env.ZOOM_ACCOUNT_ID = prev.account;
    if (prev.id) process.env.ZOOM_CLIENT_ID = prev.id;
    if (prev.secret) process.env.ZOOM_CLIENT_SECRET = prev.secret;
  });
});
