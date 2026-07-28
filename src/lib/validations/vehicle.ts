import { z } from "zod";
import { DocumentStatus } from "@prisma/client";

const optionalText = z
  .union([z.string(), z.literal("")])
  .optional()
  .transform((value) => (value ? value : undefined));

export const vehicleSchema = z.object({
  id: z.string().optional(),
  plate: z
    .string()
    .min(2, "2 caractères minimum.")
    .max(12, "12 caractères maximum.")
    .transform((value) => value.toUpperCase()),
  make: z.string().min(1, "Marque requise."),
  model: z.string().min(1, "Modèle requis."),
  color: optionalText,
  class: optionalText,
  vin: optionalText,
  ownerId: optionalText,
  registration: z.nativeEnum(DocumentStatus).default(DocumentStatus.VALID),
  insurance: z.nativeEnum(DocumentStatus).default(DocumentStatus.VALID),
  isImpounded: z.boolean().default(false),
  notes: optionalText,
  imageUrl: optionalText,
});
export type VehicleInput = z.infer<typeof vehicleSchema>;

export const flagStolenSchema = z.object({
  vehicleId: z.string().min(1),
  isStolen: z.boolean(),
});
