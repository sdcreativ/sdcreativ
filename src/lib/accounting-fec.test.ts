import { describe, expect, it } from "vitest";
import { buildCiAccountingCsv, buildFecLines, buildFecTxt } from "@/lib/accounting-fec";

const sampleRow = {
  type: "invoice" as const,
  reference: "FAC-2026-0001",
  date: "2026-07-18",
  clientName: "Client Test",
  company: "ACME CI",
  subtotal: 100_000,
  tvaRate: 18,
  tvaAmount: 18_000,
  total: 118_000,
  paidAmount: 118_000,
  status: "paid",
  paymentMode: "cinetpay",
  currency: "XOF",
  exchangeRateToXof: null,
  legalEntityCode: "sdcreativ-ci",
  totalXof: 118_000,
};

describe("accounting FEC / CI", () => {
  it("génère des écritures équilibrées VE + OD", () => {
    const lines = buildFecLines([sampleRow]);
    expect(lines.length).toBeGreaterThanOrEqual(4);
    const debit = lines.reduce((s, l) => s + l.debit, 0);
    const credit = lines.reduce((s, l) => s + l.credit, 0);
    expect(debit).toBe(credit);
    const txt = buildFecTxt(lines);
    expect(txt).toContain("JournalCode");
    expect(txt).toContain("411000");
    expect(txt).toContain("701000");
  });

  it("exporte un CSV CI avec séparateur point-virgule", () => {
    const csv = buildCiAccountingCsv([sampleRow]);
    expect(csv.split("\n")[0]).toContain("TTC_XOF");
    expect(csv).toContain("FAC-2026-0001");
    expect(csv).toContain("sdcreativ-ci");
  });
});
