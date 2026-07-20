# Phase 6 — Statistiques & reporting 3CX

Agrégats serveur sur `communication_events` + cohorte leads sources 3CX.

---

## Endpoint

`GET /api/admin/reports/communications?period=month&channel=all`

Auth : `reports.view` **ou** `communications.read`.

| Query | Valeurs |
|-------|---------|
| `period` | `week` · `month` · `quarter` · `year` · `all` |
| `channel` | `all` · `chat` · `call` · `meeting` |

Réponse : `{ stats: CommunicationsStats }` — voir `src/lib/communications-stats.ts`.

Export : `GET /api/admin/reports/communications/export?period=&channel=` → CSV.

---

## KPI fournis

| KPI | Source |
|-----|--------|
| Chats aujourd’hui / semaine | Fenêtres glissantes (indépendantes du filtre période) |
| Chats / appels / réunions (période) | `communication_events` |
| Appels entrants / sortants | `direction` |
| Taux réponse / manqués | `disposition` + heuristique durée |
| Durée moyenne | `duration_sec` non null |
| Leads 3CX vs autres | `leads.source` sur la période |
| Conversion cohorte 3CX | devis liés / signés / clients (`lead_id`) |

### Disposition

Heuristique (`classifyCallOutcome`) :

- disposition type `missed` / `no-answer` → manqué
- disposition type `answered` / `completed` → répondu
- sinon durée > 0 → répondu
- sinon appel inbound durée 0/null → manqué

---

## UI

- Widget dashboard **Communications 3CX**
- Panneau stats en tête de `/admin/crm/communications`
- Section dans **Rapports** CRM
- Export CSV depuis le panneau

---

## Ops

Les compteurs restent à 0 tant que la journalisation Phase 3 (template PRO) ou des inserts manuels ne peuplent pas `communication_events`. Les leads `live_chat_3cx` / `call_3cx` (screen-pop PME) alimentent déjà la cohorte leads / conversion.
