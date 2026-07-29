import type { Metadata } from "next";
import Link from "next/link";
import { ShieldCheck, Pin } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { requireActor, can } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = {
  title: "Tableau de bord — MDT",
};

export default async function DashboardPage() {
  const actor = await requireActor();
  const activeMemberships = actor.memberships.filter((m) => m.status === "ACTIVE");
  const departmentIds = activeMemberships.map((m) => m.departmentId);

  // Les annonces internes remontent ici : c'est la première page vue en
  // prenant son service.
  const announcements = await prisma.announcement.findMany({
    where: actor.isSuperAdmin
      ? {}
      : { OR: [{ departmentId: null }, { departmentId: { in: departmentIds } }] },
    orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
    take: 5,
    include: {
      author: { select: { firstName: true, lastName: true } },
      department: { select: { shortName: true } },
    },
  });

  return (
    <div className="flex flex-col gap-7">
      <div className="border-b border-border pb-5">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-[1.75rem]">
          Bonjour, {actor.firstName} {actor.lastName}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {activeMemberships.length > 0
            ? "Voici vos affectations actives."
            : "Vous n'avez aucune affectation active pour le moment."}
        </p>
      </div>

      {announcements.length > 0 ? (
        <section className="flex flex-col gap-3">
          <h2 className="text-xs font-semibold tracking-[0.1em] text-muted-foreground uppercase">Annonces</h2>
          <div className="flex flex-col gap-2">
            {announcements.map((announcement) => (
              <article
                key={announcement.id}
                className="flex flex-col gap-1.5 rounded-md border border-border bg-card p-4 transition-colors hover:border-muted-foreground/35 hover:bg-[var(--surface-raised)]"
              >
                <div className="flex flex-wrap items-center gap-2">
                  {announcement.isPinned ? <Pin className="size-3.5 text-department" /> : null}
                  <span className="font-medium">{announcement.title}</span>
                  <Badge variant="secondary">
                    {announcement.department?.shortName ?? "Tous services"}
                  </Badge>
                </div>
                <p className="text-sm whitespace-pre-wrap text-muted-foreground">{announcement.content}</p>
                <span className="text-xs text-muted-foreground">
                  {announcement.author.firstName} {announcement.author.lastName} ·{" "}
                  {format(announcement.createdAt, "dd/MM/yyyy", { locale: fr })}
                </span>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {activeMemberships.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {activeMemberships.map((membership) => (
            <Card key={membership.id} className="border-l-2 border-l-department">
              <CardHeader>
                <CardTitle className="font-mono">{membership.departmentShortName}</CardTitle>
                <CardDescription>{membership.departmentName}</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-1 text-sm text-muted-foreground">
                <span>{membership.gradeName}</span>
                <span className="font-mono">Matricule #{membership.badgeNumber}</span>
                {membership.callsign ? <span className="font-mono">{membership.callsign}</span> : null}
                {membership.isPrimary ? (
                  <span className="mt-1 text-xs text-department">Affectation principale</span>
                ) : null}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : null}

      {can(actor, "admin.panel") ? (
        <Link
          href="/admin"
          className="flex w-fit items-center gap-2 rounded-md border border-border bg-card px-4 py-3 text-sm font-medium transition-colors hover:border-department/40 hover:bg-department/10"
        >
          <ShieldCheck className="size-4 text-department" />
          Accéder au panel admin
        </Link>
      ) : null}
    </div>
  );
}
