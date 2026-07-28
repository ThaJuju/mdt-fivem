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
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Permission requise pour voir l'entrée ; absente = visible dès qu'on est connecté. */
  permission?: string;
};

/**
 * Navigation principale de l'app. Chaque phase ajoute ses entrées ici —
 * aucune autre modification du shell n'est nécessaire.
 */
export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Tableau de bord", icon: LayoutDashboard },
  { href: "/citoyens", label: "Citoyens", icon: Users, permission: "citizens.view" },
  { href: "/vehicules", label: "Véhicules", icon: Car, permission: "vehicles.view" },
  { href: "/armes", label: "Armes", icon: Crosshair, permission: "weapons.view" },
  { href: "/rapports", label: "Rapports", icon: FileText, permission: "reports.view" },
  { href: "/code-penal", label: "Code pénal", icon: Scale, permission: "penalcode.view" },
  { href: "/dispatch", label: "Dispatch", icon: RadioTower, permission: "dispatch.view" },
  { href: "/mandats", label: "Mandats", icon: Gavel, permission: "warrants.view" },
  { href: "/bolos", label: "BOLO", icon: Megaphone, permission: "bolos.view" },
  { href: "/medical", label: "Médical", icon: HeartPulse, permission: "medical.view" },
  { href: "/admin", label: "Administration", icon: ShieldCheck, permission: "admin.panel" },
];
