import type { Metadata } from "next";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { requireActor, can } from "@/lib/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Tableau de bord — MDT",
};

export default async function DashboardPage() {
  const actor = await requireActor();
  const activeMemberships = actor.memberships.filter((m) => m.status === "ACTIVE");

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Bonjour, {actor.firstName} {actor.lastName}
        </h1>
        <p className="text-muted-foreground">
          {activeMemberships.length > 0
            ? "Voici vos affectations actives."
            : "Vous n'avez aucune affectation active pour le moment."}
        </p>
      </div>

      {activeMemberships.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {activeMemberships.map((membership) => (
            <Card key={membership.id}>
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
          className="flex w-fit items-center gap-2 rounded-md border border-border bg-card px-4 py-3 text-sm hover:bg-accent"
        >
          <ShieldCheck className="size-4 text-department" />
          Accéder au panel admin
        </Link>
      ) : null}
    </div>
  );
}
