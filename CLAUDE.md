@AGENTS.md

# MDT Police & EMS — notes de projet

Site web autonome (pas de ressource FiveM, pas de NUI, pas de Lua). Base de
données indépendante du serveur de jeu, alimentée à la main.

## Commandes

```
npm run dev               # serveur maison (Next + Socket.io) — PORT/HOSTNAME surchargeables
npm run dev:next          # Next seul, sans temps réel
npm run build             # build de prod (lint + typecheck inclus)
npm start                 # prod, via le même serveur maison
npx prisma migrate dev    # nouvelle migration après modification du schéma
npx prisma db seed        # rejoue le seed (idempotent, upserts)
npx prisma studio         # explorateur de données
```

Le dispatch temps réel exige `npm run dev` (ou `npm start`) : `dev:next`
n'expose pas de WebSocket, `broadcastDispatchUpdate()` devient alors une
fonction vide et l'application fonctionne sans synchronisation.

**Pour utiliser l'application, lancer `npm start`, pas `npm run dev`.** En
mode dev, Next compile chaque route à la première visite : la navigation
donne l'impression d'une application très lente (plusieurs secondes par page
découverte, ~350 ms ensuite). En production les mêmes pages répondent en
50 à 150 ms. `npm run dev` ne sert qu'à développer, pour le rechargement à
chaud.

`.env` doit définir `DATABASE_URL` et `ADMIN_PASSWORD`. Le seed échoue
volontairement si `ADMIN_PASSWORD` est absent — ne jamais lui donner de valeur
par défaut dans le code.

Variables optionnelles : `PORT`, `HOSTNAME` (mettre `127.0.0.1` en production,
pour qu'on ne puisse pas contourner nginx en visant le port directement),
`TRUSTED_PROXY_HOPS` (nombre de proxys devant l'application, défaut 1) et
`SESSION_COOKIE_SECURE` pour forcer le drapeau du cookie de session.

## Ne pas casser la session de l'utilisateur en nettoyant

Après un test, ne PAS repasser `admin.mustChangePassword` à `true` ni vider
la table `Session` « pour revenir à l'état de seed ». Le compte `admin` est
utilisé pour de vrai : réactiver le drapeau force un changement de mot de
passe à chaque connexion, et purger les sessions déconnecte le navigateur
ouvert. Nettoyer uniquement les données créées par le test lui-même
(citoyens, rapports, uploads…), et laisser le compte tranquille.

## Permissions

Catalogue unique dans `src/lib/permissions.ts`, groupé par domaine
(`citizens`, `vehicles`, `reports`, `dispatch`, `hr`, `admin`...). Une
permission est une chaîne `domaine.action` (ex. `reports.edit_any`). Ajouter
une entrée au catalogue suffit à la rendre attribuable depuis le panel admin —
aucune autre modification nécessaire.

Chaîne de résolution : `User → Membership (une par département) → Grade →
permissions: string[]`. Les permissions effectives d'un acteur sont celles
d'**une seule adhésion** : son adhésion principale si elle est active, sinon
la première adhésion active trouvée. Ce n'est pas l'union de ses adhésions —
un agent affecté à deux services n'additionne jamais leurs droits, il exerce
avec la casquette qu'il porte. Sélecteur unique `activePrimaryMembership()`
dans `src/lib/auth.ts`, partagé par `computePermissions()` et `can()` pour
qu'ils ne puissent pas désigner deux services différents.

**Cloisonnement par service** : un domaine peut porter `restrictedTo` dans le
catalogue (`citizens`, `vehicles`, `weapons`, `penalcode`, `warrants`,
`bolos`, `charges` → `POLICE` ; `medical` → `EMS`). `can()` lit cette
contrainte via `domainAllowsDepartment()` ; elle n'est plus codée en dur dans
`auth.ts`. Un acteur sans adhésion active est refusé sur tout domaine
cloisonné.

Règle non négociable : toute server action commence par
`assertCan(actor, "domaine.action")` (voir `src/lib/auth.ts`). `isSuperAdmin`
court-circuite tous les contrôles. `useCan()` côté client sert uniquement à
masquer l'UI, jamais à remplacer le contrôle serveur.

## Sessions et limitation de débit

Changer un mot de passe ferme les **autres** sessions du compte
(`revokeOtherSessions()`), jamais celle qui exécute la requête. Les actions
d'administration qui réinitialisent un mot de passe ou désactivent un compte
appellent `revokeAllSessions()` — l'admin agit sur un autre compte que le
sien, il n'y a rien à épargner.

La connexion est limitée par `src/lib/rate-limit.ts` (fenêtre glissante **en
mémoire**, donc par processus : à réécrire le jour où l'application tourne en
plusieurs instances). Trois compteurs superposés — identifiant+adresse (5),
adresse (20), identifiant seul (30) sur 15 minutes. Le premier est volontaire :
bloquer sur l'identifiant seul permettrait à n'importe qui de verrouiller le
compte d'un agent en cinq essais. Seuls les échecs comptent, un succès remet
tout à zéro. L'envoi d'images a son propre quota, facturé au mégaoctet.

## Adresse du client derrière le proxy

Production : le site tourne derrière un reverse proxy nginx (modèle prêt à
adapter dans `deploy/nginx.conf.example`).

**Ne jamais relire `x-forwarded-for` à la main.** Passer par `clientIp()` /
`clientIpKey()` de `src/lib/client-ip.ts`, seul endroit qui sait quelle entrée
est digne de confiance. Le snippet nginx habituel
(`$proxy_add_x_forwarded_for`) **ajoute** l'adresse du pair à la fin de ce que
le client a envoyé : l'entrée fiable est la **dernière**, pas la première.
Prendre `[0]` revient à indexer la limitation de débit et le journal d'audit
sur une valeur choisie par l'attaquant.

`TRUSTED_PROXY_HOPS` (défaut 1) donne le nombre de proxys qui ajoutent leur
entrée : nginx seul = 1, un CDN devant nginx = 2. Si la chaîne reçue est plus
courte que ce nombre, `clientIp()` renvoie `null` (« inconnue » en clé) plutôt
que de faire confiance à une valeur douteuse.

`isSecureRequest()` du même module décide du drapeau `Secure` du cookie de
session, à partir de `x-forwarded-proto`. Sans cet en-tête l'application se
croit en HTTP clair et n'appose pas `Secure` — c'est voulu (LAN, IP directe),
mais cela veut dire que la ligne `proxy_set_header X-Forwarded-Proto $scheme`
n'est pas optionnelle en production.

Deux autres réglages nginx ne sont pas décoratifs : `client_max_body_size 6m`
(sinon nginx refuse les photos avant l'application, avec sa propre page 413) et
le bloc WebSocket sur `/api/socket` (sinon le dispatch temps réel — donc le
10-99 — ne passe pas).

## Entretien périodique

`src/lib/maintenance.ts`, déclenché par `server.ts` au démarrage puis toutes
les six heures : suppression des sessions périmées et des images qu'aucune
fiche ne référence plus. Comme le temps réel, ce ménage n'existe pas sous
`npm run dev:next` — l'application fonctionne, elle accumule.

Le module reçoit son client Prisma en paramètre et ne porte pas `server-only`,
parce que `server.ts` tourne en Node simple, hors runtime React : ce marqueur
y lèverait une erreur à l'import. Même raison pour `src/lib/uploads.ts`, dont
les règles de nommage servent aux deux côtés. Les fichiers de moins de 24 h
sont épargnés — un envoi tout juste déposé n'est pas encore référencé par le
formulaire qui le recevra.

## Audit

`audit(actor, action, { entity, entityId, metadata })` dans
`src/lib/audit.ts`. À appeler aussi sur les simples consultations
(`citizen.view`), pas seulement les mutations — c'est ce qui permet
d'arbitrer un litige sur un dossier consulté sans motif.

## Charges : barème figé

Quand une infraction est ajoutée à un rapport, `fine`, `jailMinutes` et
`points` sont **copiés** de `Offense` vers `Charge` au moment de la création,
puis modifiables au cas par cas. Modifier le code pénal ensuite ne doit
jamais réécrire les rapports déjà rédigés.

## Pièges Server / Client à connaître

**Les colonnes TanStack ne traversent pas la frontière.** Une `ColumnDef`
contient des fonctions `cell`/`header` : les passer d'une page serveur à
`<DataTable>` (client) lève « Functions cannot be passed directly to Client
Components » — une erreur *runtime* que `next build` ne détecte pas. D'où le
motif en place : chaque liste a son wrapper client (`citizens-table.tsx`,
`users-table.tsx`…) qui importe ses colonnes de son côté ; la page serveur ne
passe que des données sérialisables. Les `columns.tsx` sont marqués
`"use client"`. Reproduire ce motif pour toute nouvelle liste.

**`assertCan` dans une page produit un 500.** `assertCan` est la garde des
*server actions* (elle lève une `ActionError`). Pour les *pages*, utiliser
`requirePagePermission(actor, "…")` : redirige vers `/acces-refuse?p=…` qui
nomme la permission manquante en français.

Corollaire général : un `next build` vert ne prouve pas qu'une page s'affiche.
Vérifier chaque route en HTTP réel avant de considérer une phase terminée.

## Direction visuelle

Un seul thème (sombre), pas de bascule clair/sombre — c'est une console radio,
pas une app générique. Palette et tokens dans `src/app/globals.css`.

- **Couleur de département** : `--department-accent` /
  `--department-accent-foreground`, pilotées par l'attribut
  `data-department="lspd|bcso|ems"` posé sur `<html>`. Alimente `--primary`,
  `--ring`, `--sidebar-primary` — donc tout le monde en aval en profite
  automatiquement. Le layout racine pose `lspd` par défaut ; une fois l'auth
  en place, poser l'attribut selon l'adhésion principale de l'acteur.
- **Rouge d'alerte** (`--alert`, `#EF4444`) : réservé aux mandats actifs, aux
  10-99 et aux triages rouges. Les actions destructrices génériques (boutons
  "supprimer") utilisent `--destructive` (`#A64B43`, un rouge distinct et
  volontairement moins saturé) pour ne pas diluer le signal d'alerte.
- Polices : IBM Plex Sans (interface) et IBM Plex Mono (`font-mono` — plaques,
  matricules, codes d'infraction, numéros de rapport/série).

## Stack

Next.js 15 (App Router, `src/`), TypeScript strict, Prisma 6 (client
classique `prisma-client-js`, pas le générateur ESM de Prisma 7 — évite la
complexité des driver adapters), PostgreSQL 16, Tailwind v4 + shadcn/ui
(base `radix`), TanStack Table, Zod, `@node-rs/argon2` pour les mots de
passe, sessions maison (cookie httpOnly + table `Session`, token haché en
SHA-256 avant stockage).

## Plan de travail

Voir le brief original pour le détail des 9 phases (0 à 8).

- **Phase 0** — fondations : schéma Prisma complet, seed (3 départements et
  leurs grades, 30 infractions en 5 catégories, 33 10-codes, super-admin),
  libs `prisma.ts` / `permissions.ts` / `auth.ts` / `audit.ts` / `errors.ts`,
  palette et polices.
- **Phase 1** — auth (sessions maison, mot de passe forcé, middleware) et
  panel admin (comptes, départements/grades, 10-codes, journal d'audit).
  Primitives : `DataTable`, `SearchBox`, `pagination.ts`.
- **Phase 2** — fichiers : citoyens (notes signalées en bandeau, licences),
  véhicules, armes, recherche globale unifiée (`Ctrl/⌘ K`).
- **Phase 3** — code pénal (catégories + infractions) et rapports : éditeur,
  personnes impliquées, agents, véhicules, pièces jointes, charges à barème
  figé avec total automatique, workflow brouillon → soumis → validé/refusé.
- **Phase 4** — mandats (demande, approbation, exécution) et BOLO, avec
  expiration paresseuse dans `lib/expiry.ts`.
- **Phase 5** — dispatch temps réel : `server.ts` (Next + Socket.io),
  `lib/realtime.ts`, barre de statut pilotée par le statut d'unité.
- **Phase 6** — médical : dossiers, volet EMS 1-1 sur `Report`, aptitude au
  port d'arme remontée sur la fiche civile.
- **Phase 7** — RH : effectif, recrutement, grades, certifications,
  sanctions, pointage, annonces (reprises sur le tableau de bord).
- **Phase 8** — finition : pagination serveur complétée, squelettes de
  chargement, focus clavier, cibles tactiles, états vides orientés action.

Les 9 phases du brief sont livrées. Aucune vérification visuelle n'a pu être
faite — l'outillage navigateur n'était pas disponible pendant la
construction. Tout a été validé par requêtes HTTP réelles contre le serveur.

## Tester une server action en HTTP

Les formulaires ouverts dans un `Dialog` ne sont pas rendus côté serveur :
impossible d'extraire leur encodage d'action depuis le HTML. Pour les
exercer :

1. Récupérer l'identifiant de l'action — `.next/server/app/…/page.js`
   contient un mapping URL-encodé `{"id":"…","exportedName":"addCharge"}`.
2. POSTer sur l'URL de la page avec l'encodage d'un formulaire
   `useActionState`, qui passe `prevState` en argument lié :

```
curl -X POST "$BASE/rapports/$ID" -H "Cookie: mdt_session=$TOK" \
  -H "Origin: $BASE" \
  -F '$ACTION_REF_1=' \
  -F "\$ACTION_1:0={\"id\":\"$ACTION_ID\",\"bound\":\"\$@1\"}" \
  -F '$ACTION_1:1=[{}]' \
  -F "champ=valeur"
```

Sans l'argument lié, Next passe la `FormData` en *premier* argument et
l'action plante sur `formData.get is not a function`.
