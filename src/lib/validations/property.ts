import { z } from "zod";

const optionalText = z
  .union([z.string(), z.literal("")])
  .optional()
  .transform((value) => value || undefined);

export const propertySchema = z.object({
  id: z.string().optional(),
  address: z.string().trim().min(1, "Adresse requise.").max(250),
  type: optionalText,
  citizenId: optionalText,
  notes: optionalText,
});
