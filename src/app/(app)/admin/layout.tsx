import { requireActor, requirePagePermission, can } from "@/lib/auth";
import { AdminTabs } from "@/components/admin-tabs";

const ADMIN_SECTIONS = [
  { href: "/admin/comptes", label: "Comptes", permission: "admin.users.manage" },
  { href: "/admin/departements", label: "Départements & grades", permission: "admin.departments.manage" },
  { href: "/admin/codes", label: "10-codes", permission: "admin.codes.manage" },
  { href: "/admin/audit", label: "Journal d'audit", permission: "admin.audit.view" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const actor = await requireActor();
  requirePagePermission(actor, "admin.panel");

  const sections = ADMIN_SECTIONS.filter((section) => can(actor, section.permission)).map((section) => ({
    href: section.href,
    label: section.label,
  }));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Administration</h1>
        <p className="text-muted-foreground">Comptes, départements, grades, 10-codes et journal d&apos;audit.</p>
      </div>
      <AdminTabs sections={sections} />
      {children}
    </div>
  );
}
