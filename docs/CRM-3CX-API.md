# API CRM 3CX — contrat Phase 3

> Base : `https://sdcreativ.com/api/integrations/3cx`  
> Auth : `Authorization: Bearer <THREE_CX_CRM_TOKEN>`  
> Optionnel : `THREE_CX_IP_ALLOWLIST`  
> Rate-limit : 120 req / IP / minute

---

## Contact lookup

`GET /contacts/lookup?email=&phone=`

```json
{
  "contact": {
    "id": "uuid",
    "entityType": "lead",
    "entityId": "lead:uuid",
    "firstName": "…",
    "lastName": "…",
    "companyName": "…",
    "email": "…",
    "phoneBusiness": "…",
    "phoneMobile": "…",
    "contactUrl": "https://sdcreativ.com/admin/crm/leads?id=…"
  },
  "contacts": [ /* même objet si trouvé, sinon [] */ ]
}
```

Matching : 1) email normalisé 2) téléphone digits (variantes CI / 225). Préférence **client > lead**.

---

## Contact search

`GET /contacts/search?q=&limit=20`

```json
{ "contacts": [ /* ThreeCxContactDto[] */ ] }
```

---

## Contact create

`POST /contacts`

```json
{
  "firstName": "Paterne",
  "lastName": "Gnonzion",
  "email": "a@b.com",
  "phone": "+22507000000",
  "companyName": "SD CREATIV",
  "source": "live_chat_3cx"
}
```

Si match existant → renvoie le contact existant. Sinon crée un **lead** (`live_chat_3cx` ou `call_3cx`).

---

## Journal call

`POST /journal/call`

```json
{
  "externalId": "call-123",
  "entityId": "lead:uuid",
  "phone": "+225…",
  "email": "…",
  "direction": "Inbound",
  "agentExtension": "13810",
  "durationSec": 95,
  "summary": "Appel devis site vitrine"
}
```

Idempotent sur `(channel=call, external_id)`.

---

## Journal chat

`POST /journal/chat`

```json
{
  "externalId": "chat-456",
  "entityId": "client:uuid",
  "email": "…",
  "agentExtension": "13810",
  "summary": "Live chat formations"
}
```

Idempotent sur `(channel=chat, external_id)`.

---

## Mapping template 3CX (Phase 4)

Template prêt : [`integrations/3cx/sdcreativ-crm.xml`](../integrations/3cx/sdcreativ-crm.xml) · runbook [`CRM-3CX-PHASE4.md`](./CRM-3CX-PHASE4.md).

| Scénario 3CX | Endpoint |
|--------------|----------|
| Lookup (numéro) | `GET …/contacts/lookup?phone=[Number]` |
| LookupByEmail | `GET …/contacts/lookup?email=[Email]` |
| Search | `GET …/contacts/search?q=[SearchText]` |
| Create | `POST …/contacts` |
| ReportCall | `POST …/journal/call` |
| ReportChat | `POST …/journal/chat` |

Outputs lookup : `contacts.contactUrl` → ContactUrl, `contacts.entityId` → EntityId, etc.  
Durée journal : secondes **ou** `hh:mm:ss` (format 3CX).
