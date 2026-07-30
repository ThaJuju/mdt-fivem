import { PrismaClient, DepartmentType, OffenseType } from "@prisma/client";
import { hash as argon2Hash } from "@node-rs/argon2";

const prisma = new PrismaClient();

async function hashPassword(password: string): Promise<string> {
  return argon2Hash(password, {
    memoryCost: 19456,
    timeCost: 2,
    outputLen: 32,
    parallelism: 1,
  });
}

// ── Départements & grades ─────────────────────────────────────────────

type GradeSeed = {
  name: string;
  level: number;
  permissions: string[];
  isDefault?: boolean;
};

/** Empile les permissions de chaque palier pour que les grades supérieurs héritent des grades inférieurs. */
function cumulative(tiers: string[][]): string[][] {
  const result: string[][] = [];
  const acc = new Set<string>();
  for (const tier of tiers) {
    for (const permission of tier) acc.add(permission);
    result.push([...acc]);
  }
  return result;
}

const POLICE_TIERS = cumulative([
  [
    "citizens.view",
    "citizens.notes.create",
    "vehicles.view",
    "weapons.view",
    "reports.view",
    "reports.create",
    "reports.edit",
    "warrants.view",
    "bolos.view",
    "dispatch.view",
    "penalcode.view",
    "hr.roster.view",
    "hr.shifts.view",
  ],
  [
    "citizens.create",
    "citizens.edit",
    "vehicles.create",
    "vehicles.edit",
    "vehicles.flag_stolen",
    "weapons.manage",
    "charges.manage",
    "warrants.request",
    "bolos.manage",
    "dispatch.calls.create",
    "dispatch.calls.edit",
  ],
  [
    "citizens.licenses.manage",
    "citizens.notes.delete",
    "citizens.archive",
    "dispatch.calls.close",
    "reports.view_all",
  ],
  [
    "citizens.delete",
    "vehicles.delete",
    "reports.approve",
    "warrants.approve",
    "dispatch.units.assign",
    "hr.discipline",
  ],
  [
    "reports.edit_any",
    "penalcode.edit",
    "dispatch.units.manage",
    "hr.certifications.manage",
    "hr.announcements.manage",
  ],
  ["reports.delete_any", "reports.delete", "warrants.execute", "hr.hire", "hr.promote", "hr.terminate"],
]);

const EMS_TIERS = cumulative([
  [
    "citizens.view",
    "reports.view",
    "reports.create",
    "reports.edit",
    "medical.view",
    "medical.reports.create",
    "dispatch.view",
    "hr.roster.view",
    "hr.shifts.view",
  ],
  ["citizens.notes.create", "medical.edit", "dispatch.calls.create", "dispatch.calls.edit"],
  ["reports.view_all", "medical.fitness.certify", "dispatch.calls.close", "citizens.notes.delete"],
  ["reports.approve", "dispatch.units.assign", "hr.discipline", "hr.certifications.manage"],
  ["reports.edit_any", "dispatch.units.manage", "hr.announcements.manage"],
  ["reports.delete_any", "reports.delete", "hr.hire", "hr.promote", "hr.terminate"],
]);

const DEPARTMENTS: {
  name: string;
  shortName: string;
  type: DepartmentType;
  color: string;
  order: number;
  grades: GradeSeed[];
}[] = [
  {
    name: "Los Santos Police Department",
    shortName: "LSPD",
    type: DepartmentType.POLICE,
    color: "#3B6FE0",
    order: 1,
    grades: [
      { name: "Cadet", level: 1, permissions: POLICE_TIERS[0], isDefault: true },
      { name: "Officier", level: 2, permissions: POLICE_TIERS[1] },
      { name: "Caporal", level: 3, permissions: POLICE_TIERS[2] },
      { name: "Sergent", level: 4, permissions: POLICE_TIERS[3] },
      { name: "Lieutenant", level: 5, permissions: POLICE_TIERS[4] },
      { name: "Chef de police", level: 6, permissions: POLICE_TIERS[5] },
    ],
  },
  {
    name: "Blaine County Sheriff's Office",
    shortName: "BCSO",
    type: DepartmentType.POLICE,
    color: "#C9A227",
    order: 2,
    grades: [
      { name: "Cadet", level: 1, permissions: POLICE_TIERS[0], isDefault: true },
      { name: "Adjoint", level: 2, permissions: POLICE_TIERS[1] },
      { name: "Adjoint senior", level: 3, permissions: POLICE_TIERS[2] },
      { name: "Sergent", level: 4, permissions: POLICE_TIERS[3] },
      { name: "Lieutenant", level: 5, permissions: POLICE_TIERS[4] },
      { name: "Shérif", level: 6, permissions: POLICE_TIERS[5] },
    ],
  },
  {
    name: "Emergency Medical Services",
    shortName: "EMS",
    type: DepartmentType.EMS,
    color: "#F2A03D",
    order: 3,
    grades: [
      { name: "Cadet ambulancier", level: 1, permissions: EMS_TIERS[0], isDefault: true },
      { name: "Ambulancier", level: 2, permissions: EMS_TIERS[1] },
      { name: "Paramédic", level: 3, permissions: EMS_TIERS[2] },
      { name: "Superviseur", level: 4, permissions: EMS_TIERS[3] },
      { name: "Directeur adjoint", level: 5, permissions: EMS_TIERS[4] },
      { name: "Directeur", level: 6, permissions: EMS_TIERS[5] },
    ],
  },
];

// ── Code pénal ─────────────────────────────────────────────────────────

type OffenseSeed = {
  code: string;
  name: string;
  type: OffenseType;
  fine: number;
  jailMinutes: number;
  points: number;
  bail?: number;
};

const PENAL_CATEGORIES: { name: string; order: number; offenses: OffenseSeed[] }[] = [
  {
    name: "Atteintes aux personnes",
    order: 1,
    offenses: [
      { code: "P.C. 187", name: "Meurtre", type: OffenseType.FELONY, fine: 15000, jailMinutes: 120, points: 0, bail: 50000 },
      { code: "P.C. 245", name: "Voies de fait avec arme", type: OffenseType.FELONY, fine: 8000, jailMinutes: 60, points: 0, bail: 20000 },
      { code: "P.C. 211", name: "Vol qualifié", type: OffenseType.FELONY, fine: 10000, jailMinutes: 90, points: 0, bail: 25000 },
      { code: "P.C. 207", name: "Séquestration", type: OffenseType.FELONY, fine: 9000, jailMinutes: 75, points: 0, bail: 20000 },
      { code: "P.C. 240", name: "Voies de fait simples", type: OffenseType.MISDEMEANOR, fine: 2000, jailMinutes: 15, points: 0 },
      { code: "P.C. 242", name: "Coups et blessures", type: OffenseType.MISDEMEANOR, fine: 2500, jailMinutes: 20, points: 0 },
    ],
  },
  {
    name: "Atteintes aux biens",
    order: 2,
    offenses: [
      { code: "P.C. 459", name: "Cambriolage", type: OffenseType.FELONY, fine: 7000, jailMinutes: 60, points: 0, bail: 15000 },
      { code: "P.C. 10851", name: "Vol de véhicule", type: OffenseType.FELONY, fine: 6000, jailMinutes: 45, points: 0, bail: 12000 },
      { code: "P.C. 451", name: "Incendie volontaire", type: OffenseType.FELONY, fine: 12000, jailMinutes: 90, points: 0, bail: 30000 },
      { code: "P.C. 484", name: "Vol simple", type: OffenseType.MISDEMEANOR, fine: 1500, jailMinutes: 10, points: 0 },
      { code: "P.C. 594", name: "Vandalisme", type: OffenseType.MISDEMEANOR, fine: 1200, jailMinutes: 10, points: 0 },
      { code: "P.C. 496", name: "Recel", type: OffenseType.MISDEMEANOR, fine: 2000, jailMinutes: 15, points: 0 },
    ],
  },
  {
    name: "Code de la route",
    order: 3,
    offenses: [
      { code: "V.C. 2800", name: "Refus d'obtempérer", type: OffenseType.FELONY, fine: 5000, jailMinutes: 45, points: 6, bail: 10000 },
      { code: "V.C. 20001", name: "Délit de fuite", type: OffenseType.FELONY, fine: 4000, jailMinutes: 30, points: 6, bail: 8000 },
      { code: "V.C. 23152", name: "Conduite en état d'ivresse", type: OffenseType.MISDEMEANOR, fine: 2500, jailMinutes: 15, points: 4 },
      { code: "V.C. 12500", name: "Conduite sans permis", type: OffenseType.INFRACTION, fine: 500, jailMinutes: 0, points: 2 },
      { code: "V.C. 22350", name: "Excès de vitesse", type: OffenseType.INFRACTION, fine: 300, jailMinutes: 0, points: 1 },
      { code: "V.C. 21453", name: "Franchissement de feu rouge", type: OffenseType.INFRACTION, fine: 250, jailMinutes: 0, points: 1 },
    ],
  },
  {
    name: "Armes et stupéfiants",
    order: 4,
    offenses: [
      { code: "H.S. 11379", name: "Trafic de stupéfiants", type: OffenseType.FELONY, fine: 15000, jailMinutes: 120, points: 0, bail: 40000 },
      { code: "P.C. 32625", name: "Possession d'arme automatique", type: OffenseType.FELONY, fine: 10000, jailMinutes: 90, points: 0, bail: 25000 },
      { code: "H.S. 11351", name: "Possession en vue de la vente", type: OffenseType.FELONY, fine: 6000, jailMinutes: 60, points: 0, bail: 12000 },
      { code: "P.C. 12020", name: "Port d'arme prohibée", type: OffenseType.FELONY, fine: 5000, jailMinutes: 45, points: 0, bail: 10000 },
      { code: "P.C. 12025", name: "Arme dissimulée sans permis", type: OffenseType.MISDEMEANOR, fine: 2000, jailMinutes: 15, points: 0 },
      { code: "H.S. 11350", name: "Possession de stupéfiants", type: OffenseType.MISDEMEANOR, fine: 1500, jailMinutes: 15, points: 0 },
    ],
  },
  {
    name: "Ordre public",
    order: 5,
    offenses: [
      { code: "P.C. 148", name: "Résistance à l'arrestation", type: OffenseType.MISDEMEANOR, fine: 2000, jailMinutes: 20, points: 0 },
      { code: "P.C. 69", name: "Entrave à un agent", type: OffenseType.MISDEMEANOR, fine: 2500, jailMinutes: 20, points: 0 },
      { code: "P.C. 417", name: "Exhibition d'arme", type: OffenseType.MISDEMEANOR, fine: 3000, jailMinutes: 25, points: 0 },
      { code: "P.C. 148.9", name: "Fausse identité", type: OffenseType.MISDEMEANOR, fine: 1500, jailMinutes: 15, points: 0 },
      { code: "P.C. 415", name: "Trouble à l'ordre public", type: OffenseType.INFRACTION, fine: 500, jailMinutes: 5, points: 0 },
      { code: "P.C. 602", name: "Intrusion", type: OffenseType.INFRACTION, fine: 800, jailMinutes: 5, points: 0 },
    ],
  },
];

// ── 10-codes ───────────────────────────────────────────────────────────

const NEUTRAL = "#8A94A3";
const URGENT = "#F2A03D";
const CRITICAL = "#EF4444";

const STATUS_CODES: { code: string; label: string; color: string }[] = [
  { code: "10-1", label: "Mauvaise réception", color: NEUTRAL },
  { code: "10-4", label: "Bien reçu", color: NEUTRAL },
  { code: "10-6", label: "Occupé", color: NEUTRAL },
  { code: "10-7", label: "Hors service", color: NEUTRAL },
  { code: "10-8", label: "En service", color: NEUTRAL },
  { code: "10-9", label: "Répétez", color: NEUTRAL },
  { code: "10-10", label: "Dispute", color: NEUTRAL },
  { code: "10-11", label: "Animal dangereux", color: NEUTRAL },
  { code: "10-12", label: "Public présent", color: NEUTRAL },
  { code: "10-15", label: "Suspect en détention", color: NEUTRAL },
  { code: "10-16", label: "Violence domestique", color: URGENT },
  { code: "10-19", label: "Retour au poste", color: NEUTRAL },
  { code: "10-20", label: "Position", color: NEUTRAL },
  { code: "10-21", label: "Contact téléphonique", color: NEUTRAL },
  { code: "10-22", label: "Annuler", color: NEUTRAL },
  { code: "10-23", label: "En attente", color: NEUTRAL },
  { code: "10-24", label: "Intervention terminée", color: NEUTRAL },
  { code: "10-25", label: "Rejoindre", color: NEUTRAL },
  { code: "10-26", label: "Détenu à surveiller", color: NEUTRAL },
  { code: "10-27", label: "Vérification de permis", color: NEUTRAL },
  { code: "10-28", label: "Vérification d'immatriculation", color: NEUTRAL },
  { code: "10-29", label: "Vérification casier judiciaire", color: NEUTRAL },
  { code: "10-31", label: "Crime en cours", color: URGENT },
  { code: "10-32", label: "Personne armée", color: URGENT },
  { code: "10-38", label: "Interpellation véhicule", color: NEUTRAL },
  { code: "10-51", label: "Remorquage demandé", color: NEUTRAL },
  { code: "10-52", label: "Ambulance demandée", color: URGENT },
  { code: "10-55", label: "Conducteur en état d'ivresse", color: NEUTRAL },
  { code: "10-57", label: "Délit de fuite", color: URGENT },
  { code: "10-70", label: "Incendie", color: URGENT },
  { code: "10-78", label: "Besoin de renfort", color: URGENT },
  { code: "10-80", label: "Poursuite en cours", color: URGENT },
  { code: "10-99", label: "Officier en danger", color: CRITICAL },
];

async function main() {
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) {
    throw new Error(
      "ADMIN_PASSWORD est absent de l'environnement : le seed s'arrête pour éviter de créer un compte super-admin avec un mot de passe par défaut. Renseignez ADMIN_PASSWORD dans .env avant de relancer.",
    );
  }

  for (const dept of DEPARTMENTS) {
    const department = await prisma.department.upsert({
      where: { shortName: dept.shortName },
      update: { name: dept.name, type: dept.type, color: dept.color, order: dept.order },
      create: {
        name: dept.name,
        shortName: dept.shortName,
        type: dept.type,
        color: dept.color,
        order: dept.order,
      },
    });

    for (const grade of dept.grades) {
      await prisma.grade.upsert({
        where: { departmentId_level: { departmentId: department.id, level: grade.level } },
        update: {
          name: grade.name,
          permissions: grade.permissions,
          isDefault: grade.isDefault ?? false,
        },
        create: {
          departmentId: department.id,
          name: grade.name,
          level: grade.level,
          permissions: grade.permissions,
          isDefault: grade.isDefault ?? false,
        },
      });
    }
  }
  console.log(`✔ ${DEPARTMENTS.length} départements et leurs grades créés.`);

  let offenseCount = 0;
  for (const category of PENAL_CATEGORIES) {
    const penalCategory = await prisma.penalCategory.upsert({
      where: { name: category.name },
      update: { order: category.order },
      create: { name: category.name, order: category.order },
    });

    for (const offense of category.offenses) {
      await prisma.offense.upsert({
        where: { code: offense.code },
        update: {
          name: offense.name,
          categoryId: penalCategory.id,
          type: offense.type,
          fine: offense.fine,
          jailMinutes: offense.jailMinutes,
          points: offense.points,
          bail: offense.bail,
        },
        create: {
          code: offense.code,
          name: offense.name,
          categoryId: penalCategory.id,
          type: offense.type,
          fine: offense.fine,
          jailMinutes: offense.jailMinutes,
          points: offense.points,
          bail: offense.bail,
        },
      });
      offenseCount += 1;
    }
  }
  console.log(`✔ ${PENAL_CATEGORIES.length} catégories et ${offenseCount} infractions créées.`);

  for (const [index, statusCode] of STATUS_CODES.entries()) {
    await prisma.statusCode.upsert({
      where: { code: statusCode.code },
      update: { label: statusCode.label, color: statusCode.color, order: index },
      create: { code: statusCode.code, label: statusCode.label, color: statusCode.color, order: index },
    });
  }
  console.log(`✔ ${STATUS_CODES.length} 10-codes créés.`);

  const passwordHash = await hashPassword(adminPassword);
  await prisma.user.upsert({
    where: { username: "admin" },
    update: { passwordHash, isSuperAdmin: true, isActive: true },
    create: {
      username: "admin",
      passwordHash,
      firstName: "Super",
      lastName: "Admin",
      isSuperAdmin: true,
      isActive: true,
      mustChangePassword: true,
    },
  });
  console.log("✔ Compte super-admin « admin » créé.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
