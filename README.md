# MDT Omerta — Mobile Data Terminal Police & EMS

Terminal de données pour les services de police et de secours d'un serveur de
roleplay GTA V (LSPD, BCSO, EMS). C'est **un site web autonome** : pas de
ressource FiveM, pas de NUI, pas de Lua. Les agents l'ouvrent dans un
navigateur, à côté du jeu.

La base de données est indépendante du serveur de jeu et alimentée à la main :
rien n'est synchronisé automatiquement avec les joueurs, les véhicules ou
l'économie in-game.

> Projet développé pour un serveur privé, publié tel quel. Interface et
> contenu entièrement en français.

## ⚠️ État du projet : en chantier

**Le panel n'est pas terminé, et n'est plus développé activement.** Il est
utilisable et l'ensemble des modules décrits plus bas est en place, mais des
écrans restent à finir ou à peaufiner et tout n'a pas été éprouvé en conditions
réelles. Aucune passe de vérification visuelle complète n'a été faite — la
validation s'est faite par requêtes HTTP contre le serveur.

Le dépôt est publié en l'état, sans engagement de maintenance : les issues et
les pull requests ne recevront pas forcément de réponse. Reprenez-le, forkez-le,
adaptez-le — c'est justement à ça que sert la licence MIT.

À prendre pour ce que c'est : une base solide et fonctionnelle, pas un produit
fini.

## Ce que ça fait

| Module | Contenu |
| --- | --- |
| **Fichiers** | Citoyens (photo, notes signalées en bandeau, licences), véhicules, armes, propriétés. Recherche globale unifiée en `Ctrl/⌘ K`. |
| **Code pénal** | Catégories et infractions, avec amende, temps de cellule et points de permis. |
| **Rapports** | Éditeur avec personnes impliquées, agents, véhicules, pièces jointes et charges. Workflow brouillon → soumis → validé/refusé. |
| **Mandats & BOLO** | Demande, approbation, exécution ; expiration automatique. |
| **Dispatch** | Tableau temps réel (Socket.io) : appels, unités, statuts, 10-codes, alerte **10-99** diffusée sur tous les modules. |
| **Médical** | Dossiers patients, volet EMS attaché aux interventions, aptitude au port d'arme remontée sur la fiche civile. |
| **RH** | Effectif, recrutement, grades, certifications, sanctions, pointage, annonces. |
| **Amendes** | Suivi des amendes émises et de leur règlement. |
| **Admin** | Comptes, départements et grades, permissions, 10-codes, journal d'audit, tentatives de connexion. |

Quelques partis pris qui expliquent le reste du code :

- **Barème figé.** Quand une infraction est ajoutée à un rapport, l'amende, le
  temps de cellule et les points sont *copiés* depuis le code pénal. Le modifier
  ensuite ne réécrit jamais les rapports déjà rédigés.
- **Une seule casquette.** Les permissions effectives d'un agent viennent d'une
  **seule** adhésion (son service principal), jamais de l'union de ses
  adhésions. Un agent affecté à deux services n'additionne pas leurs droits.
- **Cloisonnement par service.** Les dossiers civils sont réservés à la police,
  le médical à l'EMS. Un refus dû au cloisonnement s'affiche comme tel, pas
  comme une permission manquante à réclamer à un supérieur.
- **Tout est audité**, y compris les simples consultations de fiche — pour
  pouvoir arbitrer un litige sur un dossier ouvert sans motif.
- **Archiver plutôt que supprimer.** Une fiche citoyen citée par un rapport ne
  se supprime pas ; elle s'archive et reste consultable depuis les dossiers qui
  la citent.
- **Thème sombre unique**, façon console radio, avec une couleur d'accent par
  département. Le rouge d'alerte est réservé aux mandats actifs, aux 10-99 et
  aux triages rouges.

## Stack

Next.js 15 (App Router) · TypeScript strict · Prisma 6 · PostgreSQL 16 ·
Tailwind v4 + shadcn/ui · TanStack Table · Zod · Socket.io.

Authentification maison : `@node-rs/argon2` pour les mots de passe, sessions en
base (cookie httpOnly, token haché en SHA-256 avant stockage), limitation de
débit à deux étages sur la connexion.

## Installation

Prérequis : Node.js 20+, PostgreSQL 16.

```bash
git clone https://github.com/ThaJuju/mdt-fivem.git
cd mdt-fivem
npm install
cp .env.example .env      # renseigner DATABASE_URL et ADMIN_PASSWORD
npx prisma migrate deploy
npx prisma db seed
npm run build
npm start
```

`ADMIN_PASSWORD` est **obligatoire** : le seed échoue volontairement s'il est
absent, il n'y a pas de valeur par défaut dans le code. Le seed est idempotent
(upserts) et crée les trois départements avec leurs grades, 30 infractions en
5 catégories, 33 10-codes et le compte super-admin `admin`, qui devra changer
son mot de passe à la première connexion.

Les autres variables (`PORT`, `HOSTNAME`, `TRUSTED_PROXY_HOPS`,
`SESSION_COOKIE_SECURE`) sont documentées dans [.env.example](.env.example).

## Commandes

```
npm run dev               # serveur maison (Next + Socket.io), rechargement à chaud
npm run dev:next          # Next seul, sans temps réel ni entretien périodique
npm run build             # build de prod (lint + typecheck inclus)
npm start                 # prod, via le même serveur maison
npm test                  # tests unitaires (vitest, sans base)
npm run typecheck         # tsc --noEmit
npx prisma migrate dev    # nouvelle migration après modification du schéma
npx prisma studio         # explorateur de données
```

**Pour utiliser l'application, lancer `npm start`, pas `npm run dev`.** En mode
dev, Next compile chaque route à la première visite : la navigation donne
l'impression d'une application très lente. En production, les mêmes pages
répondent en 50 à 150 ms.

Le serveur maison [`server.ts`](server.ts) porte deux choses que `next dev`
n'a pas : le WebSocket du dispatch et l'entretien périodique (sessions
périmées, images orphelines, expiration des mandats, BOLO et licences).

## Déploiement

Un modèle nginx prêt à adapter est fourni : [deploy/nginx.conf.example](deploy/nginx.conf.example).
Trois réglages n'y sont pas décoratifs :

- `proxy_set_header X-Forwarded-Proto $scheme` — sans lui, le cookie de session
  ne porte pas le drapeau `Secure` ;
- `client_max_body_size 6m` — sinon nginx refuse les photos avant l'application ;
- le bloc WebSocket sur `/api/socket` — sinon le dispatch temps réel, donc le
  10-99, ne passe pas.

Mettre `HOSTNAME=127.0.0.1` en production, pour qu'on ne puisse pas contourner
nginx en visant le port directement.

⚠️ **Une seule instance.** La limitation de débit et le registre Socket.io
vivent en mémoire du processus : deux instances derrière le même upstream
doubleraient les quotas de connexion et casseraient le temps réel. C'est
rappelé dans le fichier nginx, à l'endroit où l'on serait tenté d'ajouter un
second `server`.

## Contribuer

`npm test` couvre les invariants qu'une modification innocente casse :
résolution des permissions, cloisonnement par service, lecture de l'adresse
client derrière le proxy, limitation de débit, règles d'envoi de fichiers,
cohérence du catalogue de permissions, balayage d'expiration. La CI
(`.github/workflows/ci.yml`) rejoue `prisma generate`, lint, typecheck et tests
sur chaque poussée et chaque pull request. Le projet n'étant plus suivi, le
plus simple est sans doute de forker.

[CLAUDE.md](CLAUDE.md) contient les notes d'architecture détaillées : c'est le
document à lire avant de toucher aux permissions, aux sessions, au temps réel
ou aux rapports.

Il n'y a pas encore de tests d'intégration sur base jetable ni de fumée HTTP —
c'est l'objet de l'issue #27.

## Licence

[MIT](LICENSE). Faites-en ce que vous voulez, sans garantie.
