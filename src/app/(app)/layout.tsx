import { redirect } from "next/navigation";
import { getActor } from "@/lib/auth";
import { ActorProvider, type ClientActor } from "@/components/actor-provider";
import { TopBar } from "@/components/top-bar";
import { AppNav } from "@/components/app-nav";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const actor = await getActor();
  if (!actor) redirect("/connexion");
  if (actor.mustChangePassword) redirect("/changer-mot-de-passe");

  const clientActor: ClientActor = {
    id: actor.id,
    username: actor.username,
    firstName: actor.firstName,
    lastName: actor.lastName,
    isSuperAdmin: actor.isSuperAdmin,
    permissions: [...actor.permissions],
    memberships: actor.memberships,
  };

  const primary = actor.memberships.find((m) => m.isPrimary) ?? actor.memberships[0];
  const departmentSlug = primary ? primary.departmentShortName.toLowerCase() : "lspd";

  return (
    <ActorProvider actor={clientActor}>
      {/* Applique la couleur du département avant le premier rendu peint, sur <html> pour couvrir aussi les portails (dialogs, toasts). */}
      <script
        dangerouslySetInnerHTML={{
          __html: `document.documentElement.dataset.department=${JSON.stringify(departmentSlug)};`,
        }}
      />
      <div className="flex min-h-screen flex-col">
        <TopBar />
        <AppNav />
        <main className="flex-1 p-6">{children}</main>
      </div>
    </ActorProvider>
  );
}
