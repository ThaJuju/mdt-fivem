export const TRIAGE_LABELS: Record<string, string> = {
  GREEN: "Vert — léger",
  YELLOW: "Jaune — différable",
  ORANGE: "Orange — urgent",
  RED: "Rouge — vital",
  BLACK: "Noir — décédé",
};

export const EMS_OUTCOME_LABELS: Record<string, string> = {
  TREATED_ON_SCENE: "Soigné sur place",
  TRANSPORTED: "Transporté",
  REFUSED_CARE: "Refus de soins",
  DECEASED: "Décédé",
};

/**
 * Le rouge d'alerte est réservé au triage rouge, conformément à la règle du
 * projet. Le noir utilise le gris neutre, pas une seconde teinte d'alerte.
 */
export function triageClass(triage: string): string {
  switch (triage) {
    case "RED":
      return "bg-alert text-alert-foreground";
    case "ORANGE":
      return "bg-[#F2A03D] text-[#0D1014]";
    case "YELLOW":
      return "bg-[#C9A227] text-[#0D1014]";
    case "GREEN":
      return "bg-department/20 text-department";
    default:
      return "bg-muted text-muted-foreground";
  }
}
