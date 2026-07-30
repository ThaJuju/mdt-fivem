import { z } from "zod";
import { ReportType, InvolvementRole, EvidenceKind } from "@prisma/client";

const optionalText = z
  .union([z.string(), z.literal("")])
  .optional()
  .transform((value) => (value ? value : undefined));

export const reportSchema = z.object({
  id: z.string().optional(),
  type: z.nativeEnum(ReportType),
  title: z.string().min(1, "Titre requis."),
  content: z.string().min(1, "Contenu requis."),
  location: optionalText,
  occurredAt: z.coerce.date({ message: "Date des faits invalide." }),
  departmentId: z.string().min(1, "Département requis."),
});
export type ReportInput = z.infer<typeof reportSchema>;

export const involvementSchema = z.object({
  id: z.string().optional(),
  reportId: z.string().min(1),
  citizenId: z.string().min(1, "Citoyen requis."),
  role: z.nativeEnum(InvolvementRole),
  statement: optionalText,
});
export type InvolvementInput = z.infer<typeof involvementSchema>;

export const reportOfficerSchema = z.object({
  reportId: z.string().min(1),
  userId: z.string().min(1, "Agent requis."),
  isLead: z.boolean().default(false),
});

export const reportVehicleSchema = z.object({
  reportId: z.string().min(1),
  vehicleId: z.string().min(1, "Véhicule requis."),
  role: optionalText,
});

export const evidenceSchema = z.object({
  id: z.string().optional(),
  reportId: z.string().min(1),
  label: z.string().min(1, "Libellé requis."),
  description: optionalText,
  kind: z.nativeEnum(EvidenceKind),
  url: optionalText,
});
export type EvidenceInput = z.infer<typeof evidenceSchema>;

/**
 * À la création d'une charge, le barème est *copié* depuis l'infraction
 * (voir CLAUDE.md). Ces champs restent ensuite modifiables au cas par cas
 * sans jamais toucher au code pénal.
 */
export const chargeSchema = z.object({
  id: z.string().optional(),
  reportId: z.string().min(1),
  citizenId: z.string().min(1, "Citoyen requis."),
  offenseId: z.string().min(1, "Infraction requise."),
  count: z.coerce.number().int().min(1, "Au moins une occurrence."),
  isGuilty: z.boolean().default(true),
  notes: optionalText,
});
export type ChargeInput = z.infer<typeof chargeSchema>;

export const chargeAmountsSchema = z.object({
  id: z.string().min(1),
  reportId: z.string().min(1),
  fine: z.coerce.number().int().nonnegative(),
  jailMinutes: z.coerce.number().int().nonnegative(),
  points: z.coerce.number().int().nonnegative(),
  count: z.coerce.number().int().min(1),
  isGuilty: z.boolean().default(true),
});

export const rejectReportSchema = z.object({
  reportId: z.string().min(1),
  rejectReason: z.string().min(1, "Un motif de refus est obligatoire."),
});
