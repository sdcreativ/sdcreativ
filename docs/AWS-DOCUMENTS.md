# Stockage documents — AWS S3

Infrastructure Phase 2 pour l'espace client : factures, contrats, livrables et dépôts clients.

---

## Architecture

| Composant | Rôle |
|-----------|------|
| **S3** | Fichiers privés (bucket non public) |
| **API `/api/documents`** | Liste, upload (URL présignée), suppression (admin) |
| **API `/api/documents/download`** | Téléchargement via URL présignée (15 min) |
| **Vercel** | Hébergement Next.js — pas de stockage fichier local |

Les fichiers ne transitent **pas** par le serveur Next.js : le client upload/télécharge directement vers S3 via URLs signées.

---

## Structure du bucket

Bucket recommandé : `sdcreativ-documents-prod` (région `eu-west-1` ou `eu-central-1`).

```
sdcreativ-documents-prod/
└── clients/
    └── {clientId}/           # ex. acme-corp
        ├── invoices/         # Factures (admin)
        ├── contracts/        # Contrats (admin)
        ├── deliverables/     # Livrables, maquettes (admin)
        ├── uploads/          # Dépôts client (logo, brief PDF…)
        └── misc/             # Autres documents (admin)
```

Chaque objet : `{uuid}-{nom-fichier-sécurisé}.pdf`

Exemple de clé :

```
clients/acme-corp/invoices/3f2a1b0c-8d4e-4f1a-9c2b-1a2b3c4d5e6f-facture-2026-01.pdf
```

---

## Création AWS (console)

### 1. Bucket S3

1. **S3 → Create bucket**
2. Nom : `sdcreativ-documents-prod`
3. Région : `eu-west-1` (Irlande)
4. **Block all public access** : activé
5. Versioning : recommandé (optionnel)
6. Chiffrement : SSE-S3 (par défaut)

### 2. Utilisateur IAM dédié

Créer un utilisateur `sdcreativ-documents-app` avec cette policy (adapter le nom du bucket) :

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:ListBucket"
      ],
      "Resource": "arn:aws:s3:::sdcreativ-documents-prod",
      "Condition": {
        "StringLike": {
          "s3:prefix": ["clients/*"]
        }
      }
    },
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject"
      ],
      "Resource": "arn:aws:s3:::sdcreativ-documents-prod/clients/*"
    }
  ]
}
```

Générer une **Access Key** pour Vercel (ne jamais committer).

### 3. CORS (upload direct depuis le navigateur)

Configuration CORS du bucket :

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "PUT", "HEAD"],
    "AllowedOrigins": [
      "https://sdcreativ.com",
      "http://localhost:3000"
    ],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
```

---

## Variables d'environnement

Ajouter sur Vercel (Production) et dans `.env.local` :

```bash
AWS_REGION=eu-west-1
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
AWS_S3_BUCKET=sdcreativ-documents-prod

# Accès portail client (Phase 2 MVP) — JSON clientId → token
CLIENT_PORTAL_TOKENS={"demo-client":"remplacer-par-token-fort"}
```

Sans ces variables, l'API répond `503` avec un message explicite.

`ADMIN_SECRET` existant permet aussi l'accès admin (cookie `/admin/login` ou header `x-admin-secret`).

---

## API — Authentification

### Admin (équipe SD CREATIV)

- Cookie `sdcreativ_admin` après login `/admin/login`, **ou**
- Header `x-admin-secret: {ADMIN_SECRET}`

### Client (portail)

Headers requis :

```
x-client-id: demo-client
x-client-token: {token défini dans CLIENT_PORTAL_TOKENS}
```

---

## API — Endpoints

### `GET /api/documents?clientId=acme-corp&category=invoices`

Liste les documents d'un client (catégorie optionnelle).

**Réponse :**

```json
{
  "documents": [
    {
      "key": "clients/acme-corp/invoices/uuid-facture.pdf",
      "name": "facture.pdf",
      "category": "invoices",
      "size": 245760,
      "lastModified": "2026-06-30T10:00:00.000Z"
    }
  ]
}
```

### `POST /api/documents`

Demande une URL d'upload présignée (15 min, max 10 Mo).

**Body :**

```json
{
  "clientId": "acme-corp",
  "category": "invoices",
  "filename": "facture-juin.pdf",
  "contentType": "application/pdf"
}
```

**Réponse :**

```json
{
  "key": "clients/acme-corp/invoices/uuid-facture-juin.pdf",
  "uploadUrl": "https://s3.eu-west-1.amazonaws.com/...",
  "expiresIn": 900,
  "maxBytes": 10485760
}
```

**Upload vers S3 (côté client) :**

```bash
curl -X PUT -H "Content-Type: application/pdf" \
  --data-binary @facture-juin.pdf \
  "{uploadUrl}"
```

Les clients authentifiés ne peuvent uploader que dans `uploads`.

### `GET /api/documents/download?key=clients/...`

Retourne une URL de téléchargement présignée.

### `DELETE /api/documents`

Admin uniquement. Body : `{ "key": "clients/..." }`.

---

## Flux upload complet (JavaScript)

```typescript
// 1. Obtenir l'URL présignée
const presign = await fetch("/api/documents", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "x-client-id": "demo-client",
    "x-client-token": process.env.CLIENT_TOKEN!,
  },
  body: JSON.stringify({
    clientId: "demo-client",
    category: "uploads",
    filename: file.name,
    contentType: file.type,
  }),
}).then((r) => r.json());

// 2. Upload direct S3
await fetch(presign.uploadUrl, {
  method: "PUT",
  headers: { "Content-Type": file.type },
  body: file,
});
```

---

## Types de fichiers autorisés

- PDF
- JPEG, PNG, WebP
- Word / Excel (.doc, .docx, .xls, .xlsx)

---

## Prochaines étapes

1. Base PostgreSQL / Supabase pour métadonnées enrichies (statut, projet, notifications)
2. Auth magic link remplaçant `CLIENT_PORTAL_TOKENS`
3. UI espace client (liste + upload + téléchargement)
4. Emails automatiques (Resend ou SES) à la publication d'un document
5. Route 53 + SES (optionnel, voir discussion architecture)

---

## Fichiers du projet

| Fichier | Rôle |
|---------|------|
| `src/lib/s3.ts` | Client S3, clés, URLs présignées |
| `src/lib/documents-auth.ts` | Auth admin / client |
| `src/lib/validations/documents.ts` | Schémas Zod |
| `src/app/api/documents/route.ts` | GET, POST, DELETE |
| `src/app/api/documents/download/route.ts` | GET download |
