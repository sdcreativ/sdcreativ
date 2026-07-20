# Phase 7 — Coexistence Assistant IA ↔ 3CX

## Règle produit

| Moment | Live Chat 3CX | Assistant IA | Autres |
|--------|---------------|--------------|--------|
| **Heures ouvrées** Lun–Ven 8h–18h Abidjan, pages prioritaires, 3CX activé | Oui (humain) | Oui — message *« Un conseiller est disponible »* + bouton ouvrir le chat | WhatsApp (toujours) |
| **Hors horaires** ou 3CX off | Non | Oui — RDV `/rendez-vous` + WhatsApp | WhatsApp |
| Admin / espace client / tablette | Non | Non | — |

Code : `THREECX_AI_PRODUCT_RULE` · `resolveAiCommsMode` · `getAiGreeting` dans `src/lib/threecx/ai-coexistence.ts`.  
Layout : `FloatingWidgets` (déjà branché sur le feature flag `NEXT_PUBLIC_THREE_CX_*` + horaires).

---

## Handoff IA → humain (formation équipe)

Reprendre le fil (ouvrir Web Client / répondre en Live Chat) quand :

1. Demande de **devis personnalisé**, prix ferme ou engagement de délais  
2. Le visiteur veut **parler à un humain** / appeler  
3. **Support client** existant → file 801 / ticket CRM  
4. L’IA a enchaîné des **fallback** (« je ne sais pas »)  
5. Sujet **sensible** (litige, données personnelles)

Playbook code : `THREECX_AI_HANDOFF_PLAYBOOK`.

### Process agent

1. Voir la notif Live Chat 3CX (file **800**)  
2. Si lead inconnu : screen-pop PME ou fiche CRM Communications  
3. Si le visiteur venait de l’IA : reprendre le contexte (dernière question) sans le faire répéter  
4. Clôturer ou créer activité / lead dans le CRM  

---

## Messages IA

| Mode | Accueil |
|------|---------|
| `handoff` | Conseiller dispo + CTA **Ouvrir le chat conseiller** |
| `after_hours` | Liens RDV + WhatsApp + devis |
| `default` | Orientation générique (3CX non monté) |

Événement : `sdcreativ:open-threecx-chat` (écouteur `ThreeCxWidget`).

---

## Contenu marketing

- FAQ Solutions IA : coexistence IA / chat conseiller  
- Base chat (`chat-knowledge`) : contact + entrée « conseiller »  

Si la FAQ est customisée en base (`site_solutions_ia`), mettre à jour via CRM Site ou laisser les défauts au prochain reset.

---

## Checklist validation

- [ ] Heures ouvrées + 3CX on : bulle 3CX + IA avec CTA handoff  
- [ ] Clic CTA → charge / ouvre call-us 3CX  
- [ ] Hors horaires : pas de 3CX, IA propose RDV + WhatsApp  
- [ ] Page Solutions IA : FAQ à jour  
- [ ] Équipe briefée sur le playbook handoff  
