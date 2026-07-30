"use client";

import { createContext, useContext } from "react";

export type ClientActorMembership = {
  id: string;
  departmentId: string;
  departmentName: string;
  departmentShortName: string;
  departmentColor: string;
  departmentType: string;
  gradeId: string;
  gradeName: string;
  gradeLevel: number;
  badgeNumber: string;
  callsign: string | null;
  isPrimary: boolean;
  status: string;
};

export type ClientActor = {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
  isSuperAdmin: boolean;
  permissions: string[];
  memberships: ClientActorMembership[];
};

const ActorContext = createContext<ClientActor | null>(null);

export function ActorProvider({
  actor,
  children,
}: {
  actor: ClientActor;
  children: React.ReactNode;
}) {
  return <ActorContext.Provider value={actor}>{children}</ActorContext.Provider>;
}

export function useActor(): ClientActor {
  const actor = useContext(ActorContext);
  if (!actor) {
    throw new Error("useActor() doit être appelé sous un <ActorProvider>.");
  }
  return actor;
}

/**
 * Vérification côté client, uniquement pour masquer des éléments d'UI.
 * Le contrôle qui compte reste `assertCan()` côté serveur.
 */
export function useCan(permission: string): boolean {
  const actor = useActor();
  if (actor.isSuperAdmin) return true;
  const primary =
    actor.memberships.find((membership) => membership.isPrimary && membership.status === "ACTIVE") ??
    actor.memberships.find((membership) => membership.status === "ACTIVE");
  const domain = permission.split(".")[0];
  const policeOnly = new Set(["citizens", "vehicles", "weapons", "penalcode", "warrants", "bolos", "charges"]);
  if (domain === "medical" && primary?.departmentType !== "EMS") return false;
  if (policeOnly.has(domain) && primary?.departmentType !== "POLICE") return false;
  return actor.permissions.includes(permission);
}
