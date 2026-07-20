# Phase 1 — Socle 3CX (runbook opérationnel)

> Hors code CRM. À exécuter dans la console Hosted 3CX.  
> Config attendue : `src/lib/threecx/socle.ts` · Accès : [`CRM-3CX-ACCES.md`](./CRM-3CX-ACCES.md)  
> Doc officielle Live Chat : [3cx.com/docs/manual/live-chat](https://www.3cx.com/docs/manual/live-chat/)

**Livrable repo (fait)** : blueprint + messages + checklist + readiness env.  
**Livrable ops (à faire)** : cocher chaque étape ci-dessous après exécution réelle, puis renseigner `.env`.

---

## 0. Prérequis

- [ ] Compte / commande **Hosted 3CX** (Professional ou Enterprise) avec Live Chat + Web Client
- [ ] Au moins **2 licences agents**
- [ ] Domaines site connus : `sdcreativ.com`, `www.sdcreativ.com` (+ `localhost:3000` pour tests)
- [ ] Coffre-fort pour mots de passe / MFA (jamais dans git)

---

## 1. Provisionner le PBX + HTTPS

1. Finaliser l’onboarding Hosted 3CX (email System Owner).
2. Noter le **FQDN** (ex. `sdcreativ.3cx.fr`) — **sans** `https://`.
3. Vérifier que la Management Console / Web Client répond en HTTPS (certificat valide).
4. Fuseau PBX / département : **`Africa/Abidjan`**.
5. Renseigner dans `.env.local` / secrets prod :
   ```bash
   THREE_CX_PBX_FQDN=sdcreativ.3cx.fr
   ```
6. Compléter le tableau Instance dans [`CRM-3CX-ACCES.md`](./CRM-3CX-ACCES.md).

- [ ] PBX accessible · FQDN renseigné

---

## 2. Utilisateurs agents + Web Client

Créer les extensions (alignées sur le cadrage) :

| Extension | Rôle | Droits |
|-----------|------|--------|
| 100 | Agent commercial 1 | Web Client, Live Chat, appels |
| 101 | Agent commercial 2 | Web Client, Live Chat, appels |
| 102 | Escalade / direction | Web Client, WebMeeting (optionnel MVP) |

1. Admin → Users : créer 100, 101 (, 102).
2. Chaque agent se connecte une fois au **Web Client** (navigateur) et accepte micro / caméra si demandé.
3. Stocker identifiants dans le coffre-fort.
4. Quand ≥ 2 agents OK :
   ```bash
   THREE_CX_CONFIRMED_AGENTS=2
   ```

- [ ] ≥ 2 agents Web Client opérationnels

---

## 3. Files d’attente

| Ext. | Nom | Usage |
|------|-----|--------|
| 800 | Accueil commercial | **Destination Live Chat MVP** + appels site |
| 801 | Support technique | Clients maintenance (plus tard) |

1. Créer les queues / ring groups selon l’édition.
2. Ajouter les agents 100–101 comme membres de **800**.
3. Office hours du département de la file 800 : **Lun–Ven 8h–18h**, fuseau Abidjan.

- [ ] File 800 créée et agents rattachés

---

## 4. Live Chat (Website Link)

Dans le **Web Client** : Admin → **Voice & chat** → **+ Add Live Chat**.

| Champ | Valeur MVP |
|-------|------------|
| Destination | Queue / ext. **800** (Accueil commercial) |
| Website | `https://sdcreativ.com` (et www si demandé) |
| Infos visiteur | Nom + email requis ; téléphone optionnel |
| Appel audio | **Oui** — autoriser l’appel WebRTC sans chat préalable |
| Vidéo visiteurs | Non (MVP) |
| Affichage | Bulle (bubble) |

Textes (onglet **Messages**) — aussi dans `THREECX_WIDGET_COPY` :

**FR — online**

> Bonjour ! Bienvenue chez SD CREATIV. Comment pouvons-nous vous aider ? Chat ou appel audio — un conseiller vous répond.

**FR — offline**

> Nos conseillers sont disponibles du lundi au vendredi, de 8h à 18h (Abidjan). Laissez-nous un message, utilisez l’assistant IA, WhatsApp ou prenez rendez-vous en ligne — nous vous répondrons dès l’ouverture.

**EN** : voir `src/lib/threecx/cadrage.ts` (`THREECX_WELCOME_MESSAGE_EN` / `THREECX_OFFLINE_MESSAGE_EN`).

Onglet **Advanced** :
- Activer l’appel vers la queue si aucun agent ne traite le chat (si proposé).
- Activer notice GDPR / confidentialité (lien vers `/politique-confidentialite`).

Après Save : copier le **Website Link / HTML code** →

```bash
NEXT_PUBLIC_THREE_CX_LIVE_CHAT_LINK=…   # URL ou identifiant fourni par 3CX
# Garder false jusqu’à Phase 2
NEXT_PUBLIC_THREE_CX_ENABLED=false
```

- [ ] Live Chat créé · lien collé dans `.env`

---

## 5. Click-to-Call / appel audio visiteurs

1. Dans la config Live Chat, confirmer l’option **allow visitors to call** (WebRTC).
2. Tester depuis un navigateur privé (pas connecté agent) : bulle → appel → sonne sur Web Client agent.
3. Vérifier micro autorisé côté visiteur et agent.

- [ ] Appel audio visiteur → agent OK

---

## 6. WebMeeting (équipe)

1. Depuis le Web Client d’un agent : démarrer une **réunion / meeting** navigateur.
2. Inviter le 2ᵉ agent (lien meet).
3. Valider audio + vidéo agent ↔ agent.

- [ ] WebMeeting agent ↔ agent OK

---

## 7. Tests de validation (bloquants Phase 1)

| # | Scénario | Résultat |
|---|----------|----------|
| T1 | Chat visiteur → file 800 → agent répond | |
| T2 | Appel audio visiteur → agent décroche | |
| T3 | Meeting vidéo 100 ↔ 101 | |

Quand T1–T3 OK :

```bash
THREE_CX_CONSOLE_TESTS_PASSED=true
```

Puis :

```bash
npm run threecx:check
```

Attendu : `ready: true`.

- [ ] T1 · T2 · T3 validés · `npm run threecx:check` vert

---

## 8. Hand-off Phase 2

Phase 2 (widget site) peut démarrer dès que `readyForWidget: true` (FQDN + Live Chat link).  
Ne pas mettre `NEXT_PUBLIC_THREE_CX_ENABLED=true` avant le composant widget et les règles horaires Option A.

Checklist hand-off :
- [ ] [`CRM-3CX-ACCES.md`](./CRM-3CX-ACCES.md) complété (sans secrets)
- [ ] Variables env renseignées (local + secrets prod)
- [ ] `npm run threecx:check` → ready (ou au moins readyForWidget)
- [ ] Cases Phase 1 cochées dans [`CRM-3CX-PLAN.md`](./CRM-3CX-PLAN.md)
