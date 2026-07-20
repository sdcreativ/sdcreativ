# Configuration Resend — emails SD CREATIV

Guide pas à pas pour envoyer les emails du site (contact, devis, newsletter, CRM) via [Resend](https://resend.com), avec le domaine **`sdcreativ.com`** hébergé chez **Hostinger**.

> **Variables d'environnement :** voir `.env.docker.example` (production Docker) et `.env.local` en développement.

---

## Vue d'ensemble

| Composant | Rôle |
|-----------|------|
| **Resend** | Envoi des emails transactionnels (API HTTP) |
| **DNS Hostinger** | Vérification du domaine (SPF, DKIM) — **obligatoire** |
| **Boîte mail Hostinger** | **Optionnelle** pour l'envoi via Resend |
| **`src/lib/email.ts`** | Point d'entrée unique (`sendEmail`) pour tout le projet |

### Ce qui utilise Resend

| Usage | Route / module |
|-------|----------------|
| Formulaire contact | `/api/contact` |
| Devis en ligne | `/api/devis` |
| Newsletter | `/api/newsletter` |
| Candidatures | `/api/carriere` |
| Invitations CRM | `crm-invitation.ts` |
| Emails leads / devis / factures | `/api/admin/.../email` |
| Rappels calendrier (cron) | `/api/cron/calendar-reminders` |
| Rapports planifiés | `/api/cron/scheduled-reports` |

---

## Étape 1 — Créer le compte et la clé API

1. Créer un compte sur [resend.com](https://resend.com).
2. Aller dans **API Keys → Create API Key**.
3. Copier la clé (format `re_...`) — elle ne s'affiche qu'**une seule fois**.
4. Ajouter dans `.env.local` (dev) ou `.env.docker` (production Docker) :

```env
RESEND_API_KEY=re_votre_cle_ici
CONTACT_FROM_EMAIL=contact@sdcreativ.com
CONTACT_TO_EMAIL=contact@sdcreativ.com
```

5. **Redémarrer** l'application après toute modification :

```bash
# Local
npm run dev

# Production Docker (VPS)
docker compose -f docker-compose.yml -f docker-compose.prod.yml --profile prod up -d --build app
```

> **Sécurité :** ne jamais commiter `.env.local` / `.env.docker`. En cas de fuite, révoquer la clé sur Resend et en créer une nouvelle.

---

## Étape 2 — Vérifier le domaine sur Resend (DNS Hostinger)

L'envoi depuis `contact@sdcreativ.com` **exige** que le domaine soit **Verified** sur Resend. Sans cela, l'API renvoie une erreur 403 :

```text
The sdcreativ.com domain is not verified.
```

### Procédure

1. **Resend → Domains → Add Domain** → saisir `sdcreativ.com`.
2. Resend affiche les enregistrements DNS à créer (généralement **SPF** en TXT et **DKIM** en CNAME ou TXT).
3. Ouvrir **Hostinger → Domaines → sdcreativ.com → Zone DNS**.
4. Ajouter **chaque** enregistrement exactement comme indiqué par Resend (nom, type, valeur).
5. Attendre la propagation (quelques minutes à 24 h).
6. Sur Resend, le statut doit passer à **Verified** (vert).

### Vérifier la propagation

```bash
dig TXT sdcreativ.com +short
dig TXT resend._domainkey.sdcreativ.com +short   # exemple DKIM — le nom exact est celui affiché par Resend
```

### Erreurs DNS fréquentes

| Problème | Solution |
|----------|----------|
| Domaine « Pending » longtemps | Attendre 24 h ; vérifier qu'il n'y a pas de typo dans la valeur |
| DKIM en échec | Copier le CNAME/TXT **sans** modifier le host (par ex. `resend._domainkey`) |
| SPF en double | Un seul enregistrement SPF par domaine ; fusionner si Hostinger en a déjà un |
| Anciens enregistrements email Hostinger | Ne pas supprimer MX si vous utilisez la messagerie Hostinger ; SPF/DKIM Resend sont compatibles |

---

## Étape 3 — Boîte mail Hostinger : faut-il créer `contact@sdcreativ.com` ?

### Pour **envoyer** via Resend (formulaires du site)

**Non.** Resend envoie **au nom de** `contact@sdcreativ.com` grâce au DNS (SPF/DKIM). Aucune boîte mail Hostinger n'est requise pour l'envoi.

### Pour **recevoir** les notifications du site

Les formulaires envoient un email à **`CONTACT_TO_EMAIL`**. Cette adresse peut être :

- votre email personnel (Hotmail, Gmail, etc.) ;
- une boîte `contact@sdcreativ.com` créée chez Hostinger ;
- une redirection Hostinger vers votre email perso.

Exemple sans boîte Hostinger :

```env
CONTACT_FROM_EMAIL=contact@sdcreativ.com
CONTACT_TO_EMAIL=votre-email@example.com
```

Le visiteur est en **Reply-To** sur la notification : en répondre, c'est répondre directement au client.

### Options pour recevoir sur `@sdcreativ.com`

| Option | Quand l'utiliser |
|--------|------------------|
| **A — Email perso dans `CONTACT_TO_EMAIL`** | Démarrage rapide, pas de coût mail Hostinger |
| **B — Boîte Hostinger** | hPanel → Emails → créer `contact@sdcreativ.com` |
| **C — Redirection Hostinger** | `contact@sdcreativ.com` → votre Gmail/Hotmail |

---

## Étape 4 — Tester

### Production / domaine vérifié

1. Vérifier **Verified** sur Resend pour `sdcreativ.com`.
2. Variables renseignées dans `.env.docker` et conteneur redémarré.
3. Soumettre le formulaire sur https://sdcreativ.com/contact
4. Vérifier la réception sur `CONTACT_TO_EMAIL`.
5. **CRM** : Paramètres → Santé du système → ligne Resend verte ; ou envoi d'un email test depuis les modèles.

### Développement local — domaine pas encore vérifié

Resend autorise l'expéditeur de test **`onboarding@resend.dev`**, uniquement vers **l'email du compte Resend** :

```env
RESEND_API_KEY=re_votre_cle_ici
CONTACT_FROM_EMAIL=onboarding@resend.dev
CONTACT_TO_EMAIL=email-inscription-resend@example.com
```

### Sans clé API en local

Si `RESEND_API_KEY` est absente, le mode **console** s'active : le contenu de l'email s'affiche dans le terminal (`[Email — mode console]`), sans envoi réel.

### Comportement en production sans clé

Sans `RESEND_API_KEY`, les formulaires **échouent** avec le message « Impossible d'envoyer le message » — comportement voulu pour ne pas afficher un faux succès.

---

## Variables d'environnement

| Variable | Obligatoire | Description |
|----------|-------------|-------------|
| `RESEND_API_KEY` | Oui (prod) | Clé API Resend (`re_...`) |
| `CONTACT_FROM_EMAIL` | Oui | Adresse expéditeur — domaine **Verified** sur Resend (ex. `contact@sdcreativ.com`) |
| `CONTACT_FROM_NAME` | Recommandé | Nom affiché dans la boîte de réception (ex. `SD CREATIV`) — format `"SD CREATIV" <contact@…>` |
| `CONTACT_TO_EMAIL` | Recommandé | Destinataire des formulaires publics (contact, devis, newsletter…) |
| `CRON_EMAIL` | Optionnel | Destinataire des rappels calendrier (souvent = `CONTACT_TO_EMAIL`) |

Voir aussi `.env.docker.example` et `.env.production.example` pour la liste complète production.

---

## Dépannage

| Symptôme | Cause probable | Action |
|----------|----------------|--------|
| « Impossible d'envoyer le message » | Domaine non vérifié | Resend → Domains → **Verified** ; corriger DNS Hostinger |
| Log `403 domain is not verified` | Idem | Étape 2 ci-dessus |
| Log `Resend error: ...` | Clé invalide ou expéditeur interdit | Vérifier clé + `CONTACT_FROM_EMAIL` |
| OK en local, échec en prod | Variables absentes sur le VPS | Remplir `.env.docker` + redémarrer le conteneur `app` |
| Email en spam | DNS incomplet (SPF / DMARC) | Voir section **Anti-spam** ci-dessous |
| Pas de log Resend après changement `.env` | Conteneur non redémarré | `docker compose … up -d --build app` |

Consulter les logs serveur :

```bash
# Terminal local : sortie de npm run dev

# VPS Docker :
docker compose -f docker-compose.yml -f docker-compose.prod.yml --profile prod logs app --tail 50
```

---

## Resend vs AWS SES (rappel)

Pour SD CREATIV à faible volume, **Resend est recommandé** : déjà intégré, API simple, gratuit jusqu'à ~3 000 emails/mois.

**SES** peut se justifier plus tard (gros volumes, stack 100 % AWS). Dans les deux cas, la **vérification DNS du domaine** reste nécessaire — changer de prestataire ne contourne pas cette étape.

---

## Anti-spam — éviter le dossier courrier indésirable

Gmail et Outlook exigent **SPF + DKIM + DMARC** (même `p=none`) pour une bonne délivrabilité.

### 1. Vérifier Resend

[Resend → Domains](https://resend.com/domains) → `sdcreativ.com` doit être **Verified** (SPF et DKIM verts).

### 2. Enregistrements DNS Hostinger (zone `sdcreativ.com`)

Copiez les valeurs **exactes** affichées par Resend. En général :

| Type | Nom / Host | Valeur (exemple) |
|------|------------|------------------|
| **TXT** | `@` | `v=spf1 include:amazonses.com ~all` |
| **TXT** | `resend._domainkey` | clé DKIM fournie par Resend |
| **TXT** | `_dmarc` | `v=DMARC1; p=none; rua=mailto:contact@sdcreativ.com; adkim=s; aspf=s` |

> **Important :** un seul enregistrement SPF par domaine. Si Hostinger en a déjà un, **fusionnez** les `include:` (ex. `v=spf1 include:amazonses.com include:_spf.resend.com ~all`) au lieu d'en ajouter un second.

Vérification :

```bash
dig TXT sdcreativ.com +short          # doit contenir v=spf1
dig TXT _dmarc.sdcreativ.com +short   # doit contenir v=DMARC1
dig TXT resend._domainkey.sdcreativ.com +short
```

### 3. Expéditeur reconnaissable

Dans `.env.docker` :

```env
CONTACT_FROM_EMAIL=contact@sdcreativ.com
CONTACT_FROM_NAME=SD CREATIV
```

Les emails partent alors en `"SD CREATIV" <contact@sdcreativ.com>` (requis par Gmail / Outlook).

### 4. Marquer « Non spam » une fois

Dans Gmail ou Outlook : ouvrir un email SD CREATIV → **Signaler comme non spam** / **Ajouter aux contacts**. Cela améliore la réputation pour les envois suivants.

### 5. Éviter

- Objet entièrement en MAJUSCULES ou avec `!!!`
- Expéditeur générique sans nom (`contact@` seul)
- Supprimer SPF/DKIM en corrigeant les enregistrements **A** du domaine

---

## Checklist go-live email

- [ ] Compte Resend créé
- [ ] Clé API générée et `RESEND_API_KEY` renseignée dans `.env.docker`
- [ ] Domaine `sdcreativ.com` ajouté sur Resend
- [ ] Enregistrements SPF + DKIM + **DMARC** (`_dmarc`) dans Hostinger
- [ ] Statut **Verified** sur Resend
- [ ] `CONTACT_FROM_EMAIL=contact@sdcreativ.com`
- [ ] `CONTACT_TO_EMAIL` = boîte consultée quotidiennement
- [ ] Conteneur `app` redémarré
- [ ] Test formulaire https://sdcreativ.com/contact OK
- [ ] (Optionnel) Boîte ou redirection `contact@sdcreativ.com` chez Hostinger

---

## Voir aussi

- [`.env.docker.example`](../.env.docker.example) — modèle variables production Docker
- [`DEPLOIEMENT-SDCREATIV-COM.md`](./DEPLOIEMENT-SDCREATIV-COM.md) — déploiement VPS complet
- [`DOCKER-PRODUCTION.md`](./DOCKER-PRODUCTION.md) — stack Docker et variables
- [`VPS-POST-DEPLOIEMENT.md`](./VPS-POST-DEPLOIEMENT.md) — checklist post-déploiement
