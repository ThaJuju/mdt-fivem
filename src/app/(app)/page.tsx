import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, Building2, IdCard, MessagesSquare, Newspaper, Pin, Radio, ShieldCheck } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { requireActor, can } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DashboardShift } from "@/components/dashboard-shift";

export const metadata: Metadata = {
  title: "Tableau de bord — MDT",
};

export default async function DashboardPage() {
  const actor = await requireActor();
  const activeMemberships = actor.memberships.filter((m) => m.status === "ACTIVE");
  const primary = activeMemberships.find((membership) => membership.isPrimary) ?? activeMemberships[0];

  const [announcements, openShift] = await Promise.all([
    prisma.announcement.findMany({
      where: actor.isSuperAdmin
        ? {}
        : { OR: [{ departmentId: null }, ...(primary ? [{ departmentId: primary.departmentId }] : [])] },
      orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
      take: 8,
      include: {
        author: { select: { firstName: true, lastName: true } },
        department: { select: { shortName: true } },
      },
    }),
    prisma.shift.findFirst({
      where: { userId: actor.id, endedAt: null },
      include: { department: { select: { shortName: true } } },
    }),
  ]);

  return (
    <div className="flex flex-col gap-8">
      <section className="panel-surface relative overflow-hidden rounded-xl px-5 py-7 sm:px-8 sm:py-9">
        <div className="absolute inset-y-0 right-0 hidden w-2/5 bg-[radial-gradient(circle_at_center,color-mix(in_srgb,var(--department-accent)_16%,transparent),transparent_68%)] sm:block" />
        <div className="relative z-10 flex flex-col justify-between gap-7 md:flex-row md:items-end">
          <div>
            <div className="eyebrow mb-3 flex items-center gap-2">
              <span className="status-dot" />
              Session opérationnelle
            </div>
            <h1 className="max-w-3xl text-3xl font-semibold tracking-tight sm:text-4xl">
              Bonjour, {actor.firstName}.
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
              {activeMemberships.length > 0
                ? "Votre terminal est synchronisé. Retrouvez vos affectations et les dernières informations de service."
                : "Votre terminal est actif, mais aucune affectation ne vous est attribuée pour le moment."}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-3 rounded-lg border border-border/80 bg-background/40 px-4 py-3">
            <Building2 className="size-4 text-department" />
            <div>
              <p className="font-mono text-lg font-semibold leading-none">{activeMemberships.length}</p>
              <p className="mt-1 text-[0.6875rem] tracking-wide text-muted-foreground uppercase">
                Affectation{activeMemberships.length > 1 ? "s" : ""} active{activeMemberships.length > 1 ? "s" : ""}
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="grid items-start gap-6 xl:grid-cols-[0.72fr_1.28fr]">
        <DashboardShift
          department={
            primary
              ? {
                  id: primary.departmentId,
                  shortName: primary.departmentShortName,
                  gradeName: primary.gradeName,
                  callsign: primary.callsign,
                }
              : null
          }
          openShift={
            openShift
              ? {
                  id: openShift.id,
                  departmentShortName: openShift.department.shortName,
                  startedAt: openShift.startedAt.toISOString(),
                }
              : null
          }
        />

        <section className="panel-surface overflow-hidden rounded-xl">
          <div className="flex items-center justify-between border-b border-border/70 px-5 py-4">
            <div>
              <p className="eyebrow">Fil d&apos;actualité</p>
              <h2 className="mt-1 text-lg font-semibold">Informations de service</h2>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs text-muted-foreground">{announcements.length.toString().padStart(2, "0")}</span>
              <Newspaper className="size-4 text-department" />
            </div>
          </div>

          {announcements.length === 0 ? (
            <div className="flex flex-col items-center px-5 py-12 text-center">
              <Newspaper className="mb-3 size-6 text-muted-foreground/60" />
              <p className="text-sm font-medium">Aucune actualité récente</p>
              <p className="mt-1 text-xs text-muted-foreground">Les annonces de votre service apparaîtront ici.</p>
            </div>
          ) : (
            <div className="max-h-[31rem] divide-y divide-border/70 overflow-y-auto">
              {announcements.map((announcement, index) => (
                <article key={announcement.id} className="group relative grid grid-cols-[auto_1fr] gap-4 px-5 py-4 transition-colors hover:bg-accent/40">
                  <div className="flex flex-col items-center">
                    <span className="mt-1 flex size-8 items-center justify-center rounded-md border border-border bg-background/55 text-department">
                      {announcement.department ? <Radio className="size-3.5" /> : <MessagesSquare className="size-3.5" />}
                    </span>
                    {index < announcements.length - 1 ? <span className="mt-2 h-full w-px bg-border/70" /> : null}
                  </div>
                  <div className="min-w-0 pb-1">
                    <div className="flex flex-wrap items-center gap-2">
                      {announcement.isPinned ? <Pin className="size-3.5 text-department" /> : null}
                      <h3 className="font-medium group-hover:text-department">{announcement.title}</h3>
                      <Badge variant="secondary">{announcement.department?.shortName ?? "Interservices"}</Badge>
                    </div>
                    <p className="mt-2 line-clamp-3 text-sm leading-6 whitespace-pre-wrap text-muted-foreground">{announcement.content}</p>
                    <p className="mt-3 font-mono text-[0.6875rem] text-muted-foreground">
                      {announcement.author.firstName} {announcement.author.lastName} ·{" "}
                      {format(announcement.createdAt, "dd MMM yyyy à HH:mm", { locale: fr })}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>

      {activeMemberships.length > 0 ? (
        <section>
          <p className="eyebrow">Profil de service</p>
          <h2 className="mt-1 mb-4 text-lg font-semibold">Vos affectations</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {activeMemberships.map((membership) => (
              <Card key={membership.id} className="group border-t-2 border-t-department">
                <CardHeader className="border-b border-border/60 pb-4">
                  <div className="mb-2 flex items-start justify-between">
                    <span className="flex size-9 items-center justify-center rounded-md bg-department/10 text-department">
                      <Radio className="size-4" />
                    </span>
                    {membership.isPrimary ? (
                      <Badge className="border-department/25 bg-department/10 text-department">Principale</Badge>
                    ) : null}
                  </div>
                  <CardTitle className="font-mono text-lg">{membership.departmentShortName}</CardTitle>
                  <CardDescription>{membership.departmentName}</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-3 pt-1 text-sm text-muted-foreground">
                  <span className="flex items-center gap-2"><ShieldCheck className="size-3.5 text-department" />{membership.gradeName}</span>
                  <span className="flex items-center gap-2 font-mono"><IdCard className="size-3.5 text-department" />Matricule #{membership.badgeNumber}</span>
                  {membership.callsign ? <span className="font-mono text-foreground">{membership.callsign}</span> : null}
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      ) : null}

      {can(actor, "admin.panel") ? (
        <Link
          href="/admin"
          className="group flex w-fit items-center gap-3 rounded-lg border border-border bg-card/80 px-4 py-3 text-sm font-medium shadow-[0_12px_35px_rgb(0_0_0/0.14)] transition-all hover:-translate-y-0.5 hover:border-department/40 hover:bg-department/10"
        >
          <ShieldCheck className="size-4 text-department" />
          Accéder au panel admin
          <ArrowUpRight className="size-3.5 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
        </Link>
      ) : null}
    </div>
  );
}
