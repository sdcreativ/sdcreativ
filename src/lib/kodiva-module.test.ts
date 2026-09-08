import { describe, expect, it } from "vitest";
import { parseKodivaModuleSnapshot } from "@/lib/kodiva-module";

const sample = {
  product: "KODIVA",
  generatedAt: "2026-09-08T08:00:00.000Z",
  links: {
    home: "http://localhost:3002/admin",
    embed: "http://localhost:3002/admin?embed=1",
    tenants: "http://localhost:3002/admin/tenants",
    ops: "http://localhost:3002/admin/ops",
  },
  kpis: {
    tenants: 3,
    suspended: 0,
    webhookFailures: 1,
    failedDocuments: 0,
    failedSyncs: 0,
    quotaAlerts: 0,
    monthCostMicros: 1_500_000,
    monthTokens: 42,
  },
  incidents: {
    webhooks: [{ id: "w1", tenantId: "t1", status: "FAILED", eventType: "lead.created" }],
    documents: [],
    syncs: [],
    alerts: [],
  },
};

describe("parseKodivaModuleSnapshot", () => {
  it("accepte le contrat GET /v1/admin/module", () => {
    const parsed = parseKodivaModuleSnapshot(sample);
    expect(parsed.product).toBe("KODIVA");
    expect(parsed.kpis.tenants).toBe(3);
    expect(parsed.incidents.webhooks).toHaveLength(1);
  });

  it("refuse un payload hors contrat (pas de conversations)", () => {
    expect(() => parseKodivaModuleSnapshot({ product: "OTHER" })).toThrow();
  });
});
