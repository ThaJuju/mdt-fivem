@AGENTS.md

# MDT Police & EMS — notes de projet

Site web autonome (pas de ressource FiveM, pas de NUI, pas de Lua). Base de
données indépendante du serveur de jeu, alimentée à la main.

## Commandes

```
npm run dev              # serveur de dev
npm run build             # build de prod (lint + typecheck inclus)
npx prisma migrate dev    # nouvelle migration après modification du schéma
npx prisma db seed        # rejoue le seed (idempotent, upserts)
npx prisma studio         # explorateur de données
```

`.env` doit définir `DATABASE_URL` et `ADMIN_PASSWORD`. Le seed échoue
volontairement si `ADMIN_PASSWORD` est absent — ne jamais lui donner de valeur
par défaut dans le code.

## Permissions

Catalogue unique dans `src/lib/permissions.ts`, groupé par domaine
(`citizens`, `vehicles`, `reports`, `dispatch`, `hr`, `admin`...). Une
permission est une chaîne `domaine.action` (ex. `reports.edit_any`). Ajouter
une entrée au catalogue suffit à la rendre attribuable depuis le panel admin —
aucune autre modification nécessaire.

Chaîne de résolution : `User → Membership (une par département) → Grade →
permissions: string[]`. Les permissions effectives d'un acteur sont l'union
des grades de ses **adhésions actives** (`Membership.status === "ACTIVE"`),
calculée dans `getActor()` (`src/lib/auth.ts`).

Règle non négociable : toute server action commence par
`assertCan(actor, "domaine.action")` (voir `src/lib/auth.ts`). `isSuperAdmin`
court-circuite tous les contrôles. `useCan()` côté client sert uniquement à
masquer l'UI, jamais à remplacer le contrôle serveur.

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

Voir le brief original pour le détail des 9 phases (0 à 8). Statut suivi via
les tâches de la session — Phase 0 (fondations) posée : schéma Prisma complet,
seed (3 départements/grades, 30 infractions en 5 catégories, 10-codes,
super-admin), libs `prisma.ts` / `permissions.ts` / `auth.ts` / `audit.ts` /
`errors.ts`, palette et polices en place.
