import { describe, expect, it } from "vitest";
import { loginIdMatchesPortalClient } from "@/lib/client-portal-resolve";

describe("loginIdMatchesPortalClient", () => {
  it("accepte l'identifiant exact ou préfixe", () => {
    expect(loginIdMatchesPortalClient("restaurant-krk", "restaurant-krk")).toBe(true);
    expect(loginIdMatchesPortalClient("restaurant-krk", "restaurant-krk-a1b2c3d4")).toBe(true);
    expect(loginIdMatchesPortalClient("RESTAURANT-KRK", "restaurant-krk-a1b2c3d4")).toBe(true);
  });

  it("refuse un identifiant non lié", () => {
    expect(loginIdMatchesPortalClient("autre-client", "restaurant-krk-a1b2c3d4")).toBe(false);
  });
});
