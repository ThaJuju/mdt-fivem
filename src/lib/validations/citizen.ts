import { z } from "zod";
import { DocumentStatus } from "@prisma/client";

const optionalText = z
  .union([z.string(), z.literal("")])
  .optional()
  .transform((value) => (value ? value : undefined));

const optionalInt = z
  .union([z.coerce.number().int(), z.literal("")])
  .optional()
  .transform((value) => (value === "" || value === undefined ? undefined : value));

export const citizenSchema = z.object({
  id: z.string().optional(),
  firstName: z.string().min(1, "Prénom requis."),
  lastName: z.string().min(1, "Nom requis."),
  dob: z.coerce.date({ message: "Date de naissance invalide." }),
  gender: z.string().min(1, "Genre requis."),
  height: optionalInt,
  weight: optionalInt,
  hairColor: optionalText,
  eyeColor: optionalText,
  address: optionalText,
  postal: optionalText,
  phone: optionalText,
  occupation: optionalText,
  imageUrl: optionalText,
  fingerprint: optionalText,
});
export type CitizenInput = z.infer<typeof citizenSchema>;

export const citizenNoteSchema = z.object({
  citizenId: z.string().min(1),
  content: z.string().min(1, "Contenu requis."),
  isFlagged: z.boolean().default(false),
});
export type CitizenNoteInput = z.infer<typeof citizenNoteSchema>;

export const licenseSchema = z.object({
  id: z.string().optional(),
  citizenId: z.string().min(1),
  type: z.string().min(1, "Type requis."),
  status: z.nativeEnum(DocumentStatus).default(DocumentStatus.VALID),
  points: z.coerce.number().int().min(0).default(0),
  issuedAt: z.coerce.date({ message: "Date de délivrance invalide." }),
  expiresAt: z
    .union([z.coerce.date(), z.literal("")])
    .optional()
    .transform((value) => (value === "" || value === undefined ? undefined : value)),
});
export type LicenseInput = z.infer<typeof licenseSchema>;

export const declareDeceasedSchema = z.object({
  citizenId: z.string().min(1),
  isDeceased: z.boolean(),
});
