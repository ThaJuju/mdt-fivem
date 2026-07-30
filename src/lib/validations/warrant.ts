import { z } from "zod";
import { WarrantType, BoloType } from "@prisma/client";

const optionalText = z
  .union([z.string(), z.literal("")])
  .optional()
  .transform((value) => (value ? value : undefined));

const optionalDate = z
  .union([z.coerce.date(), z.literal("")])
  .optional()
  .transform((value) => (value === "" || value === undefined ? undefined : value));

export const warrantRequestSchema = z.object({
  type: z.nativeEnum(WarrantType),
  citizenId: z.string().min(1, "Citoyen requis."),
  reason: z.string().min(1, "Motif requis."),
  address: optionalText,
  propertyId: optionalText,
  expiresAt: optionalDate,
  reportId: optionalText,
});
export type WarrantRequestInput = z.infer<typeof warrantRequestSchema>;

export const warrantDecisionSchema = z.object({
  warrantId: z.string().min(1),
  expiresAt: optionalDate,
});

export const boloSchema = z.object({
  id: z.string().optional(),
  type: z.nativeEnum(BoloType),
  title: z.string().min(1, "Titre requis."),
  description: z.string().min(1, "Description requise."),
  citizenId: optionalText,
  vehicleId: optionalText,
  plate: optionalText,
  imageUrl: optionalText,
  expiresAt: optionalDate,
});
export type BoloInput = z.infer<typeof boloSchema>;
