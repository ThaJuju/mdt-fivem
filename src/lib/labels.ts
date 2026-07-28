/** Libellés français des énumérations Prisma, partagés serveur et client. */

export const REPORT_TYPE_LABELS: Record<string, string> = {
  INCIDENT: "Incident",
  ARREST: "Arrestation",
  CITATION: "Contravention",
  INVESTIGATION: "Enquête",
  FIELD_INTERVIEW: "Contrôle sur le terrain",
  USE_OF_FORCE: "Usage de la force",
  EMS_INTERVENTION: "Intervention médicale",
};

export const REPORT_STATUS_LABELS: Record<string, string> = {
  DRAFT: "Brouillon",
  SUBMITTED: "En attente de validation",
  APPROVED: "Validé",
  REJECTED: "Refusé",
};

export const INVOLVEMENT_ROLE_LABELS: Record<string, string> = {
  SUSPECT: "Suspect",
  VICTIM: "Victime",
  WITNESS: "Témoin",
  COMPLAINANT: "Plaignant",
  PATIENT: "Patient",
  OTHER: "Autre",
};

export const EVIDENCE_KIND_LABELS: Record<string, string> = {
  IMAGE: "Image",
  VIDEO: "Vidéo",
  DOCUMENT: "Document",
  OBJECT: "Objet",
};

export const OFFENSE_TYPE_LABELS: Record<string, string> = {
  INFRACTION: "Infraction",
  MISDEMEANOR: "Délit",
  FELONY: "Crime",
};

/** Formate une durée de prison en minutes vers un libellé lisible. */
export function formatJailTime(minutes: number): string {
  if (minutes <= 0) return "—";
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) return `${rest} min`;
  if (rest === 0) return `${hours} h`;
  return `${hours} h ${rest} min`;
}

export function formatMoney(amount: number): string {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(
    amount,
  );
}
