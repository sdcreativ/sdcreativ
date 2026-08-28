import { afterEach, describe, expect, it } from "vitest";
import { isClamAvEnabled, parseClamdReply } from "@/lib/clamav";

describe("isClamAvEnabled", () => {
  afterEach(() => {
    delete process.env.CLAMAV_ENABLED;
    delete process.env.CLAMAV_HOST;
  });

  it("est actif si CLAMAV_ENABLED=1", () => {
    process.env.CLAMAV_ENABLED = "1";
    expect(isClamAvEnabled()).toBe(true);
  });

  it("est inactif si CLAMAV_ENABLED=0 même avec un host", () => {
    process.env.CLAMAV_ENABLED = "0";
    process.env.CLAMAV_HOST = "clamav";
    expect(isClamAvEnabled()).toBe(false);
  });

  it("est actif si seul CLAMAV_HOST est défini", () => {
    process.env.CLAMAV_HOST = "clamav";
    expect(isClamAvEnabled()).toBe(true);
  });
});

describe("parseClamdReply", () => {
  it("accepte un flux propre", () => {
    expect(parseClamdReply("stream: OK")).toBe("clean");
  });

  it("extrait la signature d’un fichier infecté", () => {
    expect(parseClamdReply("stream: Eicar-Test-Signature FOUND")).toEqual({
      infected: "Eicar-Test-Signature",
    });
  });
});
