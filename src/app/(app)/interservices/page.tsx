import type { Metadata } from "next";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { MessagesSquare, Radio, ShieldCheck } from "lucide-react";
import { requireActor } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { InterserviceForm } from "./interservice-form";

export const metadata: Metadata = { title: "Interservices — MDT" };

export default async function InterservicesPage() {
  const actor = await requireActor();
  const primary =
    actor.memberships.find((membership) => membership.isPrimary && membership.status === "ACTIVE") ??
    actor.memberships.find((membership) => membership.status === "ACTIVE");

  const allowed = actor.isSuperAdmin || (primary && ["POLICE", "EMS"].includes(primary.departmentType));
  if (!allowed) {
    return <p className="panel-surface rounded-lg p-8 text-center text-muted-foreground">Une affectation Police ou EMS active est nécessaire.</p>;
  }

  const posts = await prisma.announcement.findMany({
    where: { departmentId: null, isPinned: false },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      author: {
        select: {
          firstName: true,
          lastName: true,
          memberships: {
            where: { isPrimary: true },
            take: 1,
            select: { badgeNumber: true, department: { select: { shortName: true, type: true } } },
          },
        },
      },
    },
  });

  await audit(actor, "interservices.view");

  return (
    <div className="flex flex-col gap-7">
      <section className="panel-surface relative overflow-hidden rounded-xl p-6 sm:p-8">
        <div className="pointer-events-none absolute -top-24 right-0 size-72 rounded-full bg-department/10 blur-3xl" />
        <div className="relative">
          <p className="eyebrow">Canal commun Police · EMS</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Interservices</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
            Partagez les informations opérationnelles utiles aux deux services sans exposer les dossiers internes Police ou médicaux.
          </p>
        </div>
      </section>

      <div className="grid items-start gap-6 xl:grid-cols-[0.8fr_1.2fr]">
        <Card className="xl:sticky xl:top-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><MessagesSquare className="size-4 text-department" />Nouvelle information</CardTitle>
          </CardHeader>
          <CardContent><InterserviceForm /></CardContent>
        </Card>

        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div><p className="eyebrow">Fil opérationnel</p><h2 className="mt-1 text-lg font-semibold">Informations partagées</h2></div>
            <Badge variant="secondary">{posts.length} publication{posts.length > 1 ? "s" : ""}</Badge>
          </div>
          {posts.length === 0 ? (
            <div className="panel-surface rounded-lg p-10 text-center text-sm text-muted-foreground">Aucune information interservices publiée.</div>
          ) : posts.map((post) => {
            const membership = post.author.memberships[0];
            const isEms = membership?.department.type === "EMS";
            return (
              <article key={post.id} className="panel-surface rounded-lg p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-md border border-border bg-background/50 text-department">
                      {isEms ? <Radio className="size-4" /> : <ShieldCheck className="size-4" />}
                    </span>
                    <div className="min-w-0">
                      <h3 className="font-semibold">{post.title}</h3>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {post.author.firstName} {post.author.lastName}
                        {membership ? ` · ${membership.department.shortName} #${membership.badgeNumber}` : ""}
                      </p>
                    </div>
                  </div>
                  <time className="font-mono text-[0.6875rem] text-muted-foreground">
                    {format(post.createdAt, "dd MMM yyyy · HH:mm", { locale: fr })}
                  </time>
                </div>
                <p className="mt-4 border-t border-border/60 pt-4 text-sm leading-6 whitespace-pre-wrap text-muted-foreground">{post.content}</p>
              </article>
            );
          })}
        </section>
      </div>
    </div>
  );
}
