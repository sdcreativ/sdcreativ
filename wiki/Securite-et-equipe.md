# Sécurité & équipe

2FA, session, rôles, profil.

[[← Accueil|Home]]

### Double authentification (2FA) · _Récent_

> TOTP prioritaire, sinon code email / SMS.

**Explication**

Obligatoire à la connexion admin. Email personnel possible pour recevoir le code.

**Fonctionnement**

Connexion → mot de passe → 2FA (app TOTP ou code reçu). Configurer TOTP dans Mon profil.

**Lien :** [/admin/crm/compte](https://sdcreativ.com/admin/crm/compte)

**Captures**

![Double authentification (2FA) — securite-session.png](https://raw.githubusercontent.com/sdcreativ/sdcreativ/main/public/crm-docs/securite-session.png)

---

### Déconnexion après inactivité · _Récent_

> Session expirée après X minutes sans activité.

**Explication**

Avertissement avant déconnexion ; possibilité de rester connecté (renouvellement cookie).

**Fonctionnement**

Paramètres → Sécurité → régler le délai (0 = off, défaut 30). Après inactivité, dialog → Continuer ou déconnexion.

**Lien :** [/admin/crm/parametres](https://sdcreativ.com/admin/crm/parametres)

**Captures**

![Déconnexion après inactivité — securite-session.png](https://raw.githubusercontent.com/sdcreativ/sdcreativ/main/public/crm-docs/securite-session.png)

---

### Invitations équipe & email pro · _Récent_

> Onboarding via email personnel + email @sdcreativ.com.

**Explication**

Génère un email pro unique ; accès messagerie Hostinger configurable. Rôles dont Directeur commercial.

**Fonctionnement**

Paramètres → Équipe → inviter (email perso) → l’utilisateur définit son mot de passe → 2FA → accès selon le rôle.

**Lien :** [/admin/crm/parametres](https://sdcreativ.com/admin/crm/parametres)

**Captures**

![Invitations équipe & email pro — securite-session.png](https://raw.githubusercontent.com/sdcreativ/sdcreativ/main/public/crm-docs/securite-session.png)

---

### Rôles & permissions

> Nav, API et dashboard filtrés par permission.

**Explication**

Chaque module exige une permission de lecture/écriture ; les widgets infra exigent `infra.view`.

**Fonctionnement**

Paramètres → rôles / utilisateurs → attribuer un rôle → vérifier la nav visible.

**Lien :** [/admin/crm/parametres](https://sdcreativ.com/admin/crm/parametres)

**Captures**

![Rôles & permissions — securite-session.png](https://raw.githubusercontent.com/sdcreativ/sdcreativ/main/public/crm-docs/securite-session.png)

---

### Mon profil

> Avatar, TOTP, sécurité personnelle.

**Explication**

Espace personnel hors Paramètres globaux.

**Fonctionnement**

Compte / Mon profil → avatar, 2FA TOTP, infos personnelles.

**Lien :** [/admin/crm/compte](https://sdcreativ.com/admin/crm/compte)

**Captures**

![Mon profil — securite-session.png](https://raw.githubusercontent.com/sdcreativ/sdcreativ/main/public/crm-docs/securite-session.png)

---

