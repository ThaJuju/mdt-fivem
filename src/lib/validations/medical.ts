import { z } from "zod";
import { Triage, EmsOutcome } from "@prisma/client";

const optionalText = z
  .union([z.string(), z.literal("")])
  .optional()
  .transform((value) => (value ? value : undefined));

/** Une liste saisie en texte libre, une entrée par ligne ou séparée par des virgules. */
const stringList = z
  .union([z.string(), z.literal("")])
  .optional()
  .transform((value) =>
    value
      ? value
          .split(/[\n,]/)
          .map((item) => item.trim())
          .filter(Boolean)
      : [],
  );

export const medicalRecordSchema = z.object({
  citizenId: z.string().min(1),
  bloodType: optionalText,
  allergies: stringList,
  conditions: stringList,
  medications: stringList,
  notes: optionalText,
});
export type MedicalRecordInput = z.infer<typeof medicalRecordSchema>;

export const fitnessSchema = z.object({
  citizenId: z.string().min(1),
  /** "yes" | "no" | "unset" — l'aptitude peut être indéterminée. */
  fitness: z.enum(["yes", "no", "unset"]),
});

export const emsDetailSchema = z.object({
  reportId: z.string().min(1),
  triage: z.nativeEnum(Triage),
  chiefComplaint: optionalText,
  injuries: optionalText,
  treatment: optionalText,
  medications: optionalText,
  outcome: z.nativeEnum(EmsOutcome),
  hospital: optionalText,
  arrivedAt: z
    .union([z.coerce.date(), z.literal("")])
    .optional()
    .transform((value) => (value === "" || value === undefined ? undefined : value)),
  clearedAt: z
    .union([z.coerce.date(), z.literal("")])
    .optional()
    .transform((value) => (value === "" || value === undefined ? undefined : value)),
});
export type EmsDetailInput = z.infer<typeof emsDetailSchema>;
