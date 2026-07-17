import { describe, expect, it } from "vitest";
import type { TeamMember } from "@/content/team";
import { getTeamOrgTier, splitTeamByOrgTier } from "@/lib/team-org";

function member(partial: Partial<TeamMember> & Pick<TeamMember, "id" | "name" | "role">): TeamMember {
  return {
    missions: "—",
    initials: "XX",
    image: "/x.png",
    imageAlt: "x",
    ...partial,
  };
}

describe("team-org", () => {
  it("classe les cofondateurs en leadership", () => {
    expect(
      getTeamOrgTier(
        member({
          id: "a",
          name: "A",
          role: "Cofondateur & direction stratégique",
        }),
      ),
    ).toBe("leadership");
  });

  it("classe le responsable commerciale en operations", () => {
    expect(
      getTeamOrgTier(
        member({
          id: "b",
          name: "Alex",
          role: "Responsable commerciale",
        }),
      ),
    ).toBe("operations");
  });

  it("sépare correctement les niveaux", () => {
    const { leadership, operations } = splitTeamByOrgTier([
      member({ id: "1", name: "S", role: "Cofondateur & direction stratégique" }),
      member({ id: "2", name: "G", role: "Cofondateur & directeur technique / ingénieur" }),
      member({ id: "3", name: "A", role: "Responsable commerciale" }),
    ]);
    expect(leadership).toHaveLength(2);
    expect(operations).toHaveLength(1);
    expect(operations[0]?.id).toBe("3");
  });
});
