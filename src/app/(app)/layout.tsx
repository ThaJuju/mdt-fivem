import { redirect } from "next/navigation";
import { getActor, can } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ActorProvider, type ClientActor } from "@/components/actor-provider";
import { AppNav, type UnitStatusInfo } from "@/components/app-nav";
import { AnnouncementBanner, type BannerAnnouncement } from "@/components/announcement-banner";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const actor = await getActor();
  if (!actor) redirect("/connexion");
  if (actor.mustChangePassword) redirect("/changer-mot-de-passe");

  // Unité de l'agent, pour la barre de statut façon console radio.
  const unitMembership = can(actor, "dispatch.view")
    ? await prisma.unitMember.findFirst({
        where: { userId: actor.id },
        include: {
          unit: {
            include: { calls: { include: { call: { select: { number: true, code: true } } }, take: 1 } },
          },
        },
      })
    : null;

  /**
   * Annonces épinglées destinées à cet agent. Un super-admin les voit toutes,
   * comme dans le module RH : sans cela, un compte sans affectation ne verrait
   * jamais une annonce ciblée sur un service.
   */
  const departmentIds = actor.memberships.filter((m) => m.status === "ACTIVE").map((m) => m.departmentId);
  const pinned = await prisma.announcement.findMany({
    where: actor.isSuperAdmin
      ? { isPinned: true }
      : { isPinned: true, OR: [{ departmentId: null }, { departmentId: { in: departmentIds } }] },
    orderBy: { createdAt: "desc" },
    take: 3,
    include: {
      author: { select: { firstName: true, lastName: true } },
      department: { select: { shortName: true } },
    },
  });

  const bannerAnnouncements: BannerAnnouncement[] = pinned.map((announcement) => ({
    id: announcement.id,
    title: announcement.title,
    content: announcement.content,
    departmentShortName: announcement.department?.shortName ?? null,
    authorName: `${announcement.author.firstName} ${announcement.author.lastName}`,
    updatedAt: announcement.updatedAt.toISOString(),
  }));

  const unitInfo: UnitStatusInfo | null = unitMembership
    ? {
        callsign: unitMembership.unit.callsign,
        status: unitMembership.unit.status,
        callNumber: unitMembership.unit.calls[0]?.call.number ?? null,
        callCode: unitMembership.unit.calls[0]?.call.code ?? null,
      }
    : null;

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
      <div className="relative flex min-h-screen min-w-0 flex-col">
        <div
          className="console-grid pointer-events-none fixed inset-x-0 top-0 z-0 h-[32rem] opacity-40"
          aria-hidden
        />
        <AppNav unit={unitInfo} />
        <AnnouncementBanner announcements={bannerAnnouncements} />
        <main className="relative z-10 min-w-0 flex-1 px-4 py-7 sm:px-6 sm:py-9 lg:px-8">
          <div className="page-shell">{children}</div>
        </main>
      </div>
    </ActorProvider>
  );
}
