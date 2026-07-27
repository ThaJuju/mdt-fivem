import { z } from "zod";
import { DepartmentType, MembershipStatus } from "@prisma/client";
import { isValidPermission } from "@/lib/permissions";

export const usernameSchema = z
  .string()
  .min(3, "3 caractères minimum.")
  .max(32, "32 caractères maximum.")
  .regex(/^[a-z0-9._-]+$/, "Minuscules, chiffres, points et tirets uniquement.");

const optionalEmail = z
  .union([z.string().email("Adresse email invalide."), z.literal("")])
  .optional()
  .transform((value) => (value ? value : undefined));

const hexColor = z
  .string()
  .regex(/^#[0-9A-Fa-f]{6}$/, "Couleur hexadécimale invalide (ex. #3B6FE0).");

export const createUserSchema = z.object({
  username: usernameSchema,
  firstName: z.string().min(1, "Prénom requis."),
  lastName: z.string().min(1, "Nom requis."),
  email: optionalEmail,
  isSuperAdmin: z.boolean().default(false),
  password: z.string().min(8, "8 caractères minimum."),
});
export type CreateUserInput = z.infer<typeof createUserSchema>;

export const updateUserSchema = z.object({
  id: z.string().min(1),
  firstName: z.string().min(1, "Prénom requis."),
  lastName: z.string().min(1, "Nom requis."),
  email: optionalEmail,
  isActive: z.boolean(),
  isSuperAdmin: z.boolean(),
});
export type UpdateUserInput = z.infer<typeof updateUserSchema>;

export const resetPasswordSchema = z.object({
  id: z.string().min(1),
  password: z.string().min(8, "8 caractères minimum."),
});
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

export const membershipSchema = z.object({
  id: z.string().optional(),
  userId: z.string().min(1),
  departmentId: z.string().min(1, "Département requis."),
  gradeId: z.string().min(1, "Grade requis."),
  badgeNumber: z.string().min(1, "Matricule requis."),
  callsign: z
    .union([z.string(), z.literal("")])
    .optional()
    .transform((value) => (value ? value : undefined)),
  isPrimary: z.boolean().default(false),
  status: z.nativeEnum(MembershipStatus).default(MembershipStatus.ACTIVE),
});
export type MembershipInput = z.infer<typeof membershipSchema>;

export const departmentSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Nom requis."),
  shortName: z
    .string()
    .min(2, "2 caractères minimum.")
    .max(10, "10 caractères maximum.")
    .regex(/^[A-Z0-9]+$/, "Majuscules et chiffres uniquement."),
  type: z.nativeEnum(DepartmentType),
  color: hexColor,
  order: z.coerce.number().int().default(0),
  isActive: z.boolean().default(true),
});
export type DepartmentInput = z.infer<typeof departmentSchema>;

export const gradeSchema = z.object({
  id: z.string().optional(),
  departmentId: z.string().min(1),
  name: z.string().min(1, "Nom requis."),
  level: z.coerce.number().int().min(1, "Le niveau doit être supérieur ou égal à 1."),
  salary: z.coerce.number().int().nonnegative().optional().nullable(),
  isDefault: z.boolean().default(false),
  permissions: z
    .array(z.string())
    .refine((perms) => perms.every(isValidPermission), "Une des permissions sélectionnées est inconnue."),
});
export type GradeInput = z.infer<typeof gradeSchema>;

export const statusCodeSchema = z.object({
  id: z.string().optional(),
  code: z.string().min(1, "Code requis."),
  label: z.string().min(1, "Libellé requis."),
  color: hexColor,
  type: z
    .union([z.string(), z.literal("")])
    .optional()
    .transform((value) => (value ? value : undefined)),
  order: z.coerce.number().int().default(0),
});
export type StatusCodeInput = z.infer<typeof statusCodeSchema>;
