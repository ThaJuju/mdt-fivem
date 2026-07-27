import { redirect } from "next/navigation";
import { requireActor, can } from "@/lib/auth";

const FALLBACK_ORDER = [
  { href: "/admin/comptes", permission: "admin.users.manage" },
  { href: "/admin/departements", permission: "admin.departments.manage" },
  { href: "/admin/codes", permission: "admin.codes.manage" },
  { href: "/admin/audit", permission: "admin.audit.view" },
];

export default async function AdminIndexPage() {
  const actor = await requireActor();
  const target = FALLBACK_ORDER.find((section) => can(actor, section.permission));
  if (target) redirect(target.href);

  return <p className="text-muted-foreground">Aucune section du panel admin ne vous est accessible.</p>;
}
