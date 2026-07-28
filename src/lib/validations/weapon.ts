import { z } from "zod";

const optionalText = z
  .union([z.string(), z.literal("")])
  .optional()
  .transform((value) => (value ? value : undefined));

export const weaponSchema = z.object({
  id: z.string().optional(),
  serialNumber: z.string().min(1, "Numéro de série requis."),
  model: z.string().min(1, "Modèle requis."),
  type: optionalText,
  ownerId: optionalText,
  isStolen: z.boolean().default(false),
});
export type WeaponInput = z.infer<typeof weaponSchema>;
