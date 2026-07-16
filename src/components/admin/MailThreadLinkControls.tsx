"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, UserPlus, LifeBuoy, Unlink } from "lucide-react";
import { fetchClientsPaginated } from "@/lib/clients-api";
import { fetchLeadsPaginated } from "@/lib/leads-api";
import {
  createLeadFromMailThreadApi,
  createTicketFromMailThreadApi,
  linkMailThreadApi,
  type MailLinkedEntity,
} from "@/lib/mail-api";
import type { CrmMailThread } from "@/lib/mail/types";

type Props = {
  thread: CrmMailThread;
  linkedClient: MailLinkedEntity | null;
  linkedLead: MailLinkedEntity | null;
  onLinked: (thread: CrmMailThread, client: MailLinkedEntity | null, lead: MailLinkedEntity | null) => void;
};

export function MailThreadLinkControls({
  thread,
  linkedClient,
  linkedLead,
  onLinked,
}: Props) {
  const [clientQuery, setClientQuery] = useState("");
  const [leadQuery, setLeadQuery] = useState("");
  const [clientOptions, setClientOptions] = useState<MailLinkedEntity[]>([]);
  const [leadOptions, setLeadOptions] = useState<MailLinkedEntity[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const searchClients = useCallback(async (q: string) => {
    if (q.trim().length < 2) {
      setClientOptions([]);
      return;
    }
    try {
      const data = await fetchClientsPaginated({ q: q.trim(), pageSize: 8 });
      setClientOptions(
        data.clients.map((c) => ({ id: c.id, name: c.name, email: c.email })),
      );
    } catch {
      setClientOptions([]);
    }
  }, []);

  const searchLeads = useCallback(async (q: string) => {
    if (q.trim().length < 2) {
      setLeadOptions([]);
      return;
    }
    try {
      const data = await fetchLeadsPaginated({ q: q.trim(), pageSize: 8 });
      setLeadOptions(
        data.leads.map((l) => ({ id: l.id, name: l.name, email: l.email })),
      );
    } catch {
      setLeadOptions([]);
    }
  }, []);

  useEffect(() => {
    const t = window.setTimeout(() => void searchClients(clientQuery), 300);
    return () => window.clearTimeout(t);
  }, [clientQuery, searchClients]);

  useEffect(() => {
    const t = window.setTimeout(() => void searchLeads(leadQuery), 300);
    return () => window.clearTimeout(t);
  }, [leadQuery, searchLeads]);

  async function linkClient(client: MailLinkedEntity) {
    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      const updated = await linkMailThreadApi(thread.id, {
        clientId: client.id,
        leadId: linkedLead?.id ?? null,
      });
      onLinked(updated, client, linkedLead);
      setClientQuery("");
      setClientOptions([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Liaison client impossible.");
    } finally {
      setBusy(false);
    }
  }

  async function linkLead(lead: MailLinkedEntity) {
    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      const updated = await linkMailThreadApi(thread.id, {
        leadId: lead.id,
        clientId: linkedClient?.id ?? null,
      });
      onLinked(updated, linkedClient, lead);
      setLeadQuery("");
      setLeadOptions([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Liaison lead impossible.");
    } finally {
      setBusy(false);
    }
  }

  async function unlinkAll() {
    setBusy(true);
    setError(null);
    try {
      const updated = await linkMailThreadApi(thread.id, {
        clientId: null,
        leadId: null,
      });
      onLinked(updated, null, null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Dissociation impossible.");
    } finally {
      setBusy(false);
    }
  }

  async function handleCreateLead() {
    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      const result = await createLeadFromMailThreadApi(thread.id);
      if (result.thread) {
        onLinked(
          result.thread,
          result.linkedClient ?? linkedClient,
          result.linkedLead ??
            (result.lead
              ? { id: result.lead.id, name: result.lead.name, email: result.lead.email }
              : linkedLead),
        );
      }
      if (result.message) setInfo(result.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Création lead impossible.");
    } finally {
      setBusy(false);
    }
  }

  async function handleCreateTicket() {
    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      const result = await createTicketFromMailThreadApi(thread.id);
      setInfo(`Ticket ${result.ticket.reference} créé.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Création ticket impossible.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-3 space-y-2 rounded-xl border border-gray/30 bg-gray-light/40 p-3 text-xs">
      <p className="font-semibold uppercase tracking-wide text-gray-text">Liaison CRM</p>

      {(linkedClient || linkedLead) && (
        <div className="flex flex-wrap items-center gap-2">
          {linkedClient && (
            <Link
              href="/admin/crm/clients"
              className="rounded-lg bg-primary/10 px-2 py-1 font-medium text-primary"
            >
              Client : {linkedClient.name}
            </Link>
          )}
          {linkedLead && (
            <Link
              href="/admin/crm/leads"
              className="rounded-lg bg-primary/10 px-2 py-1 font-medium text-primary"
            >
              Lead : {linkedLead.name}
            </Link>
          )}
          <button
            type="button"
            disabled={busy}
            onClick={() => void unlinkAll()}
            className="inline-flex items-center gap-1 text-gray-text hover:text-accent"
          >
            <Unlink className="h-3.5 w-3.5" aria-hidden />
            Dissocier
          </button>
        </div>
      )}

      <div className="grid gap-2 sm:grid-cols-2">
        <label className="block">
          <span className="text-gray-text">Associer un client</span>
          <input
            value={clientQuery}
            onChange={(e) => setClientQuery(e.target.value)}
            disabled={busy}
            placeholder="Rechercher…"
            className="mt-1 w-full rounded-lg border border-gray/60 px-2 py-1.5 text-sm"
          />
          {clientOptions.length > 0 && (
            <ul className="mt-1 max-h-28 overflow-y-auto rounded-lg border border-gray/40 bg-white">
              {clientOptions.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void linkClient(c)}
                    className="block w-full px-2 py-1.5 text-left hover:bg-primary-light/40"
                  >
                    <span className="font-medium">{c.name}</span>
                    <span className="ml-1 text-gray-text">{c.email}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </label>
        <label className="block">
          <span className="text-gray-text">Associer un lead</span>
          <input
            value={leadQuery}
            onChange={(e) => setLeadQuery(e.target.value)}
            disabled={busy}
            placeholder="Rechercher…"
            className="mt-1 w-full rounded-lg border border-gray/60 px-2 py-1.5 text-sm"
          />
          {leadOptions.length > 0 && (
            <ul className="mt-1 max-h-28 overflow-y-auto rounded-lg border border-gray/40 bg-white">
              {leadOptions.map((l) => (
                <li key={l.id}>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void linkLead(l)}
                    className="block w-full px-2 py-1.5 text-left hover:bg-primary-light/40"
                  >
                    <span className="font-medium">{l.name}</span>
                    <span className="ml-1 text-gray-text">{l.email}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </label>
      </div>

      <div className="flex flex-wrap gap-2 pt-1">
        <button
          type="button"
          disabled={busy || Boolean(linkedLead)}
          onClick={() => void handleCreateLead()}
          className="inline-flex items-center gap-1 rounded-lg border border-gray/60 px-2 py-1.5 font-medium hover:bg-white disabled:opacity-50"
        >
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : <UserPlus className="h-3.5 w-3.5" aria-hidden />}
          Créer un lead
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => void handleCreateTicket()}
          className="inline-flex items-center gap-1 rounded-lg border border-gray/60 px-2 py-1.5 font-medium hover:bg-white disabled:opacity-50"
        >
          <LifeBuoy className="h-3.5 w-3.5" aria-hidden />
          Créer un ticket
        </button>
      </div>

      {error && <p className="text-accent">{error}</p>}
      {info && <p className="text-primary">{info}</p>}
    </div>
  );
}
