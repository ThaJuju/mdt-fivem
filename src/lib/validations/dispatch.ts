import { z } from "zod";
import { CallSource, CallStatus, UnitStatus } from "@prisma/client";

const optionalText = z
  .union([z.string(), z.literal("")])
  .optional()
  .transform((value) => (value ? value : undefined));

export const callSchema = z.object({
  id: z.string().optional(),
  source: z.nativeEnum(CallSource),
  code: optionalText,
  priority: z.coerce.number().int().min(1, "Priorité entre 1 et 5.").max(5, "Priorité entre 1 et 5."),
  title: z.string().min(1, "Titre requis."),
  description: optionalText,
  location: z.string().min(1, "Lieu requis."),
  postal: optionalText,
  callerName: optionalText,
  callerPhone: optionalText,
  tags: z.array(z.string()).default([]),
});
export type CallInput = z.infer<typeof callSchema>;

export const callStatusSchema = z.object({
  callId: z.string().min(1),
  status: z.nativeEnum(CallStatus),
});

export const closeCallSchema = z.object({
  callId: z.string().min(1),
  closeNote: optionalText,
});

export const callLogSchema = z.object({
  callId: z.string().min(1),
  message: z.string().min(1, "Message requis."),
});

export const unitSchema = z.object({
  id: z.string().optional(),
  callsign: z.string().min(1, "Indicatif requis."),
  type: z.string().min(1, "Type requis."),
});
export type UnitInput = z.infer<typeof unitSchema>;

export const unitStatusSchema = z.object({
  unitId: z.string().min(1),
  status: z.nativeEnum(UnitStatus),
});

export const assignUnitSchema = z.object({
  callId: z.string().min(1),
  unitId: z.string().min(1, "Unité requise."),
});
