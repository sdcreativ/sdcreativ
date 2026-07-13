"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, Search } from "lucide-react";
import type { CalendarInvitee } from "@/lib/calendar-invitees-types";
import { inviteeKey } from "@/lib/calendar-invitees-types";
import { fetchCalendarInvitees } from "@/lib/calendar-api";
import type { ParticipantInput } from "@/lib/calendar-participants";
import { cn } from "@/lib/utils";

const fieldClass =
  "w-full rounded-xl border border-gray/60 bg-white px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20";

type Props = {
  value: ParticipantInput[];
  onChange: (participants: ParticipantInput[]) => void;
};

export function CalendarParticipantPicker({ value, onChange }: Props) {
  const [invitees, setInvitees] = useState<CalendarInvitee[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [manualEmail, setManualEmail] = useState("");

  const selectedEmails = useMemo(
    () => new Set(value.map((p) => p.email.toLowerCase())),
    [value],
  );

  useEffect(() => {
    void fetchCalendarInvitees()
      .then(setInvitees)
      .catch(() => setInvitees([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return invitees;
    return invitees.filter(
      (i) =>
        i.name.toLowerCase().includes(q) ||
        i.email.toLowerCase().includes(q) ||
        (i.subtitle?.toLowerCase().includes(q) ?? false),
    );
  }, [invitees, search]);

  const team = filtered.filter((i) => i.source === "team");
  const clients = filtered.filter((i) => i.source === "client");

  function toggle(invitee: CalendarInvitee) {
    const email = invitee.email.toLowerCase();
    if (selectedEmails.has(email)) {
      onChange(value.filter((p) => p.email.toLowerCase() !== email));
    } else {
      onChange([
        ...value,
        { email: invitee.email, name: invitee.name, phone: invitee.phone },
      ]);
    }
  }

  function selectAll(list: CalendarInvitee[]) {
    const next = [...value];
    const existing = new Set(next.map((p) => p.email.toLowerCase()));
    for (const inv of list) {
      const email = inv.email.toLowerCase();
      if (!existing.has(email)) {
        next.push({ email: inv.email, name: inv.name, phone: inv.phone });
        existing.add(email);
      }
    }
    onChange(next);
  }

  function clearAll() {
    onChange([]);
  }

  function addManual() {
    const email = manualEmail.trim().toLowerCase();
    if (!email || !email.includes("@")) return;
    if (selectedEmails.has(email)) {
      setManualEmail("");
      return;
    }
    onChange([...value, { email, name: null, phone: null }]);
    setManualEmail("");
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-3 text-sm text-gray-text">
        <Loader2 className="h-4 w-4 animate-spin text-primary" aria-hidden />
        Chargement des contacts…
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs font-medium text-gray-text">
          {value.length} participant{value.length !== 1 ? "s" : ""} sélectionné{value.length !== 1 ? "s" : ""}
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => selectAll(filtered)}
            className="text-xs font-medium text-primary hover:underline"
          >
            Tout sélectionner
          </button>
          <button
            type="button"
            onClick={clearAll}
            className="text-xs font-medium text-gray-text hover:underline"
          >
            Tout désélectionner
          </button>
        </div>
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-text" aria-hidden />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher équipe ou client…"
          className={`${fieldClass} pl-9`}
        />
      </div>

      <div className="max-h-44 space-y-3 overflow-y-auto rounded-xl border border-gray/25 bg-gray-light/20 p-2">
        {team.length > 0 && (
          <div>
            <p className="mb-1 px-1 text-[10px] font-bold uppercase tracking-wide text-gray-text">Équipe</p>
            <ul className="space-y-1">
              {team.map((inv) => (
                <InviteeRow
                  key={inviteeKey(inv)}
                  invitee={inv}
                  checked={selectedEmails.has(inv.email.toLowerCase())}
                  onToggle={() => toggle(inv)}
                />
              ))}
            </ul>
          </div>
        )}
        {clients.length > 0 && (
          <div>
            <p className="mb-1 px-1 text-[10px] font-bold uppercase tracking-wide text-gray-text">Clients</p>
            <ul className="space-y-1">
              {clients.map((inv) => (
                <InviteeRow
                  key={inviteeKey(inv)}
                  invitee={inv}
                  checked={selectedEmails.has(inv.email.toLowerCase())}
                  onToggle={() => toggle(inv)}
                />
              ))}
            </ul>
          </div>
        )}
        {filtered.length === 0 && (
          <p className="px-2 py-3 text-center text-xs text-gray-text">Aucun contact trouvé.</p>
        )}
      </div>

      <div className="flex gap-2">
        <input
          type="email"
          value={manualEmail}
          onChange={(e) => setManualEmail(e.target.value)}
          placeholder="Email manuel (optionnel)"
          className={fieldClass}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addManual();
            }
          }}
        />
        <button
          type="button"
          onClick={addManual}
          className="shrink-0 rounded-xl border border-gray/40 px-3 text-xs font-medium hover:bg-gray-light"
        >
          Ajouter
        </button>
      </div>
    </div>
  );
}

function InviteeRow({
  invitee,
  checked,
  onToggle,
}: {
  invitee: CalendarInvitee;
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <li>
      <label
        className={cn(
          "flex cursor-pointer items-start gap-2 rounded-lg px-2 py-1.5 text-sm transition-colors",
          checked ? "bg-primary/10" : "hover:bg-white",
        )}
      >
        <input
          type="checkbox"
          checked={checked}
          onChange={onToggle}
          className="mt-0.5 rounded border-gray/60"
        />
        <span className="min-w-0 flex-1">
          <span className="block font-medium text-foreground">{invitee.name}</span>
          <span className="block truncate text-xs text-gray-text">
            {invitee.email}
            {invitee.phone ? ` · ${invitee.phone}` : ""}
            {invitee.subtitle ? ` · ${invitee.subtitle}` : ""}
          </span>
        </span>
      </label>
    </li>
  );
}
