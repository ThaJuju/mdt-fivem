export type UnitRow = {
  id: string;
  callsign: string;
  type: string;
  status: string;
  members: { userId: string; name: string; isLead: boolean }[];
  assignedCallNumbers: number[];
};

export type CallRow = {
  id: string;
  number: number;
  source: string;
  code: string | null;
  priority: number;
  title: string;
  description: string | null;
  location: string;
  postal: string | null;
  callerName: string | null;
  callerPhone: string | null;
  status: string;
  tags: string[];
  createdAt: string;
  units: { id: string; callsign: string; status: string }[];
  logs: { id: string; message: string; authorName: string | null; createdAt: string }[];
};

export type StatusCodeOption = { code: string; label: string; color: string };

export const UNIT_STATUS_LABELS: Record<string, string> = {
  AVAILABLE: "Disponible",
  BUSY: "Occupée",
  EN_ROUTE: "En route",
  ON_SCENE: "Sur place",
  PANIC: "10-99",
  OFF_DUTY: "Hors service",
};

export const CALL_STATUS_LABELS: Record<string, string> = {
  PENDING: "En attente",
  ASSIGNED: "Assigné",
  EN_ROUTE: "En route",
  ON_SCENE: "Sur place",
  CLOSED: "Clôturé",
};

export const CALL_SOURCE_LABELS: Record<string, string> = {
  EMERGENCY: "Urgence",
  NON_EMERGENCY: "Non urgent",
  OFFICER: "Agent",
};

/** Les priorités d'appel utilisent l'accent départemental, distinct du 10-99. */
export function priorityClass(priority: number): string {
  if (priority <= 1) return "border-department bg-department/10 text-department";
  if (priority === 2) return "border-department text-department";
  return "border-border text-muted-foreground";
}

export function unitStatusClass(status: string): string {
  if (status === "PANIC") return "bg-alert text-alert-foreground";
  if (status === "AVAILABLE") return "bg-department/15 text-department";
  if (status === "OFF_DUTY") return "bg-muted text-muted-foreground";
  return "bg-secondary text-secondary-foreground";
}
