import { z } from "zod";
import { OffenseType } from "@prisma/client";

const optionalText = z
  .union([z.string(), z.literal("")])
  .optional()
  .transform((value) => (value ? value : undefined));

const optionalInt = z
  .union([z.coerce.number().int().nonnegative(), z.literal("")])
  .optional()
  .transform((value) => (value === "" || value === undefined ? undefined : value));

export const penalCategorySchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Nom requis."),
  order: z.coerce.number().int().default(0),
});
export type PenalCategoryInput = z.infer<typeof penalCategorySchema>;

export const offenseSchema = z.object({
  id: z.string().optional(),
  code: z.string().min(1, "Code requis."),
  name: z.string().min(1, "Intitulé requis."),
  description: optionalText,
  categoryId: z.string().min(1, "Catégorie requise."),
  type: z.nativeEnum(OffenseType),
  fine: z.coerce.number().int().nonnegative("L'amende ne peut pas être négative."),
  jailMinutes: z.coerce.number().int().nonnegative("La peine ne peut pas être négative."),
  points: z.coerce.number().int().nonnegative("Les points ne peuvent pas être négatifs."),
  bail: optionalInt,
  isActive: z.boolean().default(true),
});
export type OffenseInput = z.infer<typeof offenseSchema>;
