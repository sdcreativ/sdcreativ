import { useEffect, useState } from "react";
import { CRM_TEAM_MEMBERS } from "@/content/crm-team";
import { fetchTeamMemberNames, fetchTeamMembers } from "@/lib/crm-users-api";

export type CrmAssigneeOption = { id: string; name: string };

/** Membres actifs pour assignation — synchronisés depuis les comptes CRM. */
export function useCrmTeamMembers(includeUnassigned = true): string[] {
  const [members, setMembers] = useState<string[]>(() => [...CRM_TEAM_MEMBERS]);

  useEffect(() => {
    void fetchTeamMemberNames()
      .then((names) => {
        const list = [...names];
        if (includeUnassigned && !list.includes("Non assigné")) {
          list.push("Non assigné");
        }
        setMembers(list.length > 0 ? list : [...CRM_TEAM_MEMBERS]);
      })
      .catch(() => setMembers([...CRM_TEAM_MEMBERS]));
  }, [includeUnassigned]);

  return members;
}

/** @deprecated Préférer useCrmAssigneeOptions (UUID). */
export function useCrmAssignees(): string[] {
  const members = useCrmTeamMembers(false);
  return members.filter((m) => m !== "Non assigné");
}

/** Options d'assignation avec ID crm_users (source de vérité). */
export function useCrmAssigneeOptions(): CrmAssigneeOption[] {
  const [options, setOptions] = useState<CrmAssigneeOption[]>([]);

  useEffect(() => {
    void fetchTeamMembers()
      .then(setOptions)
      .catch(() =>
        setOptions(CRM_TEAM_MEMBERS.map((name, i) => ({ id: `legacy-${i}`, name }))),
      );
  }, []);

  return options;
}
