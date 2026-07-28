import { z } from "zod";
import { DisciplineType } from "@prisma/client";

const optionalText = z
  .union([z.string(), z.literal("")])
  .optional()
  .transform((value) => (value ? value : undefined));

const optionalInt = z
  .union([z.coerce.number().int().positive(), z.literal("")])
  .optional()
  .transform((value) => (value === "" || value === undefined ? undefined : value));

/** Recrutement d'un compte qui n'existe pas encore : compte + affectation. */
export const hireNewSchema = z.object({
  username: z
    .string()
    .min(3, "3 caractères minimum.")
    .max(32, "32 caractères maximum.")
    .regex(/^[a-z0-9._-]+$/, "Minuscules, chiffres, points et tirets uniquement."),
  firstName: z.string().min(1, "Prénom requis."),
  lastName: z.string().min(1, "Nom requis."),
  departmentId: z.string().min(1, "Département requis."),
  gradeId: z.string().min(1, "Grade requis."),
  badgeNumber: z.string().min(1, "Matricule requis."),
  callsign: optionalText,
});
export type HireNewInput = z.infer<typeof hireNewSchema>;

export const removeFromDepartmentSchema = z.object({
  membershipId: z.string().min(1),
});

export const hireSchema = z.object({
  userId: z.string().min(1, "Agent requis."),
  departmentId: z.string().min(1, "Département requis."),
  gradeId: z.string().min(1, "Grade requis."),
  badgeNumber: z.string().min(1, "Matricule requis."),
  callsign: optionalText,
});
export type HireInput = z.infer<typeof hireSchema>;

export const promoteSchema = z.object({
  membershipId: z.string().min(1),
  gradeId: z.string().min(1, "Grade requis."),
});

export const terminateSchema = z.object({
  membershipId: z.string().min(1),
});

export const disciplineSchema = z.object({
  userId: z.string().min(1),
  type: z.nativeEnum(DisciplineType),
  reason: z.string().min(1, "Motif requis."),
  durationDays: optionalInt,
});
export type DisciplineInput = z.infer<typeof disciplineSchema>;

export const certificationSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Nom requis."),
  description: optionalText,
  departmentId: z.string().min(1, "Département requis."),
  validMonths: optionalInt,
});
export type CertificationInput = z.infer<typeof certificationSchema>;

export const grantCertificationSchema = z.object({
  userId: z.string().min(1, "Agent requis."),
  certificationId: z.string().min(1, "Formation requise."),
});

export const announcementSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(1, "Titre requis."),
  content: z.string().min(1, "Contenu requis."),
  departmentId: optionalText,
  isPinned: z.boolean().default(false),
});
export type AnnouncementInput = z.infer<typeof announcementSchema>;
