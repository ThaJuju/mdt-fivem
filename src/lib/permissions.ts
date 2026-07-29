/**
 * Catalogue des permissions du MDT.
 *
 * Chaque permission est identifiée par une chaîne `domaine.action`
 * (ex. "citizens.view", "reports.edit_any"). Ajouter une entrée ici suffit à
 * la rendre attribuable depuis le panel admin : `permissions.ts` est la
 * source de vérité, l'éditeur de grades se contente de lire ce catalogue.
 *
 * Convention : `reports.edit` porte sur les rapports de l'auteur,
 * `reports.edit_any` sur ceux de tout le monde. Même logique pour delete.
 *
 * Un domaine peut être réservé à certains types de service (`restrictedTo`).
 * Cette contrainte vit ici, et non dans `can()`, pour que la promesse du
 * catalogue reste vraie : déclarer un domaine suffit, y compris cloisonné.
 */

export type Permission = {
  key: string;
  label: string;
};

/** Reflet de `DepartmentType` (schéma Prisma), redéclaré pour rester importable côté client. */
export type DepartmentTypeKey = "POLICE" | "EMS" | "DOJ" | "ADMIN";

export type PermissionDomain = {
  key: string;
  label: string;
  permissions: Permission[];
  /**
   * Types de service autorisés à exercer ce domaine. Absent = ouvert à tous.
   *
   * Le contrôle porte sur le service *principal actif* de l'acteur : un
   * médecin affecté en second au LSPD ne consulte pas les fiches civiles avec
   * sa casquette EMS, et réciproquement le secret médical ne suit pas un
   * policier qui aurait gardé une vieille adhésion EMS.
   */
  restrictedTo?: DepartmentTypeKey[];
};

export const PERMISSIONS_CATALOG: PermissionDomain[] = [
  {
    key: "citizens",
    label: "Citoyens",
    restrictedTo: ["POLICE"],
    permissions: [
      { key: "view", label: "Consulter les fiches" },
      { key: "create", label: "Créer une fiche" },
      { key: "edit", label: "Modifier une fiche" },
      { key: "delete", label: "Supprimer une fiche" },
      { key: "notes.create", label: "Ajouter une note" },
      { key: "notes.delete", label: "Supprimer une note" },
      { key: "licenses.manage", label: "Gérer les licences" },
    ],
  },
  {
    key: "vehicles",
    label: "Véhicules",
    restrictedTo: ["POLICE"],
    permissions: [
      { key: "view", label: "Consulter les véhicules" },
      { key: "create", label: "Enregistrer un véhicule" },
      { key: "edit", label: "Modifier un véhicule" },
      { key: "delete", label: "Supprimer un véhicule" },
      { key: "flag_stolen", label: "Signaler un vol" },
    ],
  },
  {
    key: "weapons",
    label: "Armes",
    restrictedTo: ["POLICE"],
    permissions: [
      { key: "view", label: "Consulter les armes" },
      { key: "manage", label: "Gérer les armes" },
    ],
  },
  {
    key: "reports",
    label: "Rapports",
    permissions: [
      { key: "view", label: "Consulter ses rapports" },
      { key: "view_all", label: "Consulter tous les rapports" },
      { key: "create", label: "Rédiger un rapport" },
      { key: "edit", label: "Modifier ses rapports" },
      { key: "edit_any", label: "Modifier tous les rapports" },
      { key: "delete", label: "Supprimer ses rapports" },
      { key: "delete_any", label: "Supprimer tous les rapports" },
      { key: "approve", label: "Valider ou refuser un rapport" },
    ],
  },
  {
    key: "charges",
    label: "Charges",
    restrictedTo: ["POLICE"],
    permissions: [{ key: "manage", label: "Gérer les charges" }],
  },
  {
    key: "penalcode",
    label: "Code pénal",
    restrictedTo: ["POLICE"],
    permissions: [
      { key: "view", label: "Consulter le code pénal" },
      { key: "edit", label: "Modifier le code pénal" },
    ],
  },
  {
    key: "warrants",
    label: "Mandats",
    restrictedTo: ["POLICE"],
    permissions: [
      { key: "view", label: "Consulter les mandats" },
      { key: "request", label: "Demander un mandat" },
      { key: "approve", label: "Approuver un mandat" },
      { key: "execute", label: "Exécuter un mandat" },
    ],
  },
  {
    key: "bolos",
    label: "BOLO",
    restrictedTo: ["POLICE"],
    permissions: [
      { key: "view", label: "Consulter les BOLO" },
      { key: "manage", label: "Gérer les BOLO" },
    ],
  },
  {
    key: "dispatch",
    label: "Dispatch",
    permissions: [
      { key: "view", label: "Consulter le dispatch" },
      { key: "calls.create", label: "Créer un appel" },
      { key: "calls.edit", label: "Modifier un appel" },
      { key: "calls.close", label: "Clôturer un appel" },
      { key: "units.assign", label: "Assigner une unité" },
      { key: "units.manage", label: "Gérer les unités" },
    ],
  },
  {
    key: "medical",
    label: "Médical",
    restrictedTo: ["EMS"],
    permissions: [
      { key: "view", label: "Consulter les dossiers médicaux" },
      { key: "edit", label: "Modifier un dossier médical" },
      { key: "reports.create", label: "Rédiger un rapport d'intervention" },
      { key: "fitness.certify", label: "Certifier une aptitude médicale" },
    ],
  },
  {
    key: "hr",
    label: "Ressources humaines",
    permissions: [
      { key: "roster.view", label: "Consulter l'effectif" },
      { key: "hire", label: "Recruter" },
      { key: "promote", label: "Promouvoir" },
      { key: "terminate", label: "Licencier" },
      { key: "discipline", label: "Sanctionner" },
      { key: "certifications.manage", label: "Gérer les certifications" },
      { key: "shifts.view", label: "Consulter les heures de service" },
      { key: "announcements.manage", label: "Gérer les annonces" },
    ],
  },
  {
    key: "admin",
    label: "Administration",
    permissions: [
      { key: "panel", label: "Accéder au panel admin" },
      { key: "users.manage", label: "Gérer les comptes" },
      { key: "departments.manage", label: "Gérer les départements" },
      { key: "grades.manage", label: "Gérer les grades" },
      { key: "codes.manage", label: "Gérer les 10-codes" },
      { key: "audit.view", label: "Consulter le journal d'audit" },
    ],
  },
];

/** Toutes les permissions valides, sous forme `domaine.action`. */
export const ALL_PERMISSIONS: string[] = PERMISSIONS_CATALOG.flatMap((domain) =>
  domain.permissions.map((permission) => `${domain.key}.${permission.key}`),
);

const ALL_PERMISSIONS_SET = new Set(ALL_PERMISSIONS);

export function isValidPermission(permission: string): boolean {
  return ALL_PERMISSIONS_SET.has(permission);
}

const DOMAIN_RESTRICTIONS = new Map<string, Set<string>>(
  PERMISSIONS_CATALOG.filter((domain) => domain.restrictedTo).map((domain) => [
    domain.key,
    new Set<string>(domain.restrictedTo),
  ]),
);

/**
 * Le service `departmentType` a-t-il le droit d'exercer ce domaine ?
 *
 * Un domaine sans `restrictedTo` est ouvert à tous. Un acteur sans service
 * principal actif (`departmentType` nul) est refusé sur tout domaine
 * cloisonné : sans casquette, on n'exerce ni la police ni la médecine.
 */
export function domainAllowsDepartment(
  domainKey: string,
  departmentType: string | null | undefined,
): boolean {
  const allowed = DOMAIN_RESTRICTIONS.get(domainKey);
  if (!allowed) return true;
  return departmentType != null && allowed.has(departmentType);
}

export function permissionLabel(permission: string): string {
  const [domainKey, ...rest] = permission.split(".");
  const domain = PERMISSIONS_CATALOG.find((d) => d.key === domainKey);
  const action = rest.join(".");
  const found = domain?.permissions.find((p) => p.key === action);
  return found ? `${domain!.label} — ${found.label}` : permission;
}
