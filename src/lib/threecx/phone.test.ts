import { describe, expect, it } from "vitest";
import { digitsOnly, phoneMatchVariants } from "@/lib/threecx/phone";
import {
  encodeEntityId,
  parseEntityId,
  toThreeCxContactDto,
} from "@/lib/threecx/contacts";

describe("threecx phone matching", () => {
  it("extrait les digits", () => {
    expect(digitsOnly("+225 07 00 00 00 00")).toBe("2250700000000");
    expect(digitsOnly("123")).toBeNull();
  });

  it("génère variantes CI", () => {
    const v = phoneMatchVariants("0700000000");
    expect(v).toContain("0700000000");
    expect(v).toContain("2250700000000");
  });
});

describe("threecx entity id", () => {
  it("encode / parse", () => {
    expect(encodeEntityId("lead", "abc")).toBe("lead:abc");
    expect(parseEntityId("client:uuid-1")).toEqual({
      kind: "client",
      id: "uuid-1",
    });
    expect(parseEntityId("nope")).toBeNull();
  });

  it("produit un DTO avec ContactUrl", () => {
    const dto = toThreeCxContactDto({
      id: "11111111-1111-1111-1111-111111111111",
      name: "Paterne Gnonzion",
      email: "a@b.com",
      phone: "+22507000000",
      company: "SD CREATIV",
      kind: "lead",
    });
    expect(dto.firstName).toBe("Paterne");
    expect(dto.lastName).toBe("Gnonzion");
    expect(dto.entityId).toBe("lead:11111111-1111-1111-1111-111111111111");
    expect(dto.contactUrl).toContain("/admin/crm/leads?id=");
    expect(dto.email).toBe("a@b.com");
  });
});
