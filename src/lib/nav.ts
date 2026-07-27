import type { LucideIcon } from "lucide-react";
import { LayoutDashboard, ShieldCheck } from "lucide-react";

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
  { href: "/admin", label: "Administration", icon: ShieldCheck, permission: "admin.panel" },
];
