import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  ShieldCheck,
  Users,
  Car,
  Crosshair,
  FileText,
  Scale,
  Gavel,
  Megaphone,
  RadioTower,
  HeartPulse,
  Briefcase,
  Activity,
  Ambulance,
  MessagesSquare,
  BadgeDollarSign,
} from "lucide-react";

export type NavScope = "SHARED" | "POLICE" | "EMS" | "ADMIN";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  scope: NavScope;
  exact?: boolean;
  /** Permission requise pour voir l'entrée ; absente = visible dès qu'on est connecté. */
  permission?: string;
};

/**
 * Navigation principale de l'app. Chaque phase ajoute ses entrées ici —
 * aucune autre modification du shell n'est nécessaire.
 */
export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Accueil", icon: LayoutDashboard, scope: "SHARED", exact: true },
  { href: "/citoyens", label: "Citoyens", icon: Users, scope: "POLICE", permission: "citizens.view" },
  { href: "/vehicules", label: "Véhicules", icon: Car, scope: "POLICE", permission: "vehicles.view" },
  { href: "/armes", label: "Armes", icon: Crosshair, scope: "POLICE", permission: "weapons.view" },
  { href: "/code-penal", label: "Code pénal", icon: Scale, scope: "POLICE", permission: "penalcode.view" },
  { href: "/mandats", label: "Mandats", icon: Gavel, scope: "POLICE", permission: "warrants.view" },
  { href: "/bolos", label: "BOLO", icon: Megaphone, scope: "POLICE", permission: "bolos.view" },
  { href: "/amendes", label: "Amendes", icon: BadgeDollarSign, scope: "POLICE", permission: "charges.collect" },
  { href: "/medical", label: "Centre EMS", icon: HeartPulse, scope: "EMS", permission: "medical.view", exact: true },
  { href: "/medical/patients", label: "Patients", icon: Activity, scope: "EMS", permission: "medical.view" },
  { href: "/medical/interventions", label: "Interventions", icon: Ambulance, scope: "EMS", permission: "medical.view" },
  { href: "/rapports", label: "Rapports", icon: FileText, scope: "SHARED", permission: "reports.view" },
  { href: "/dispatch", label: "Dispatch", icon: RadioTower, scope: "SHARED", permission: "dispatch.view" },
  { href: "/interservices", label: "Interservices", icon: MessagesSquare, scope: "SHARED" },
  { href: "/rh", label: "RH", icon: Briefcase, scope: "SHARED", permission: "hr.roster.view" },
  { href: "/admin", label: "Administration", icon: ShieldCheck, scope: "ADMIN", permission: "admin.panel" },
];
