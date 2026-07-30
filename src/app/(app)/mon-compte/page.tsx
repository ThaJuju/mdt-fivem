import type { Metadata } from "next";
import { currentSessionId, requireActor } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ChangePasswordForm } from "@/app/changer-mot-de-passe/change-password-form";
import { UserAvatar } from "@/components/user-avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ProfileForm } from "./profile-form";
import { SessionsSection } from "@/components/sessions-section";

export const metadata: Metadata = { title: "Mon compte — MDT" };

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: "Actif",
  LOA: "Congé",
  SUSPENDED: "Suspendu",
  TERMINATED: "Terminé",
};

export default async function MonComptePage() {
  const actor = await requireActor();
  const [user, activeSessionId] = await Promise.all([
    prisma.user.findUniqueOrThrow({
      where: { id: actor.id },
      select: {
        firstName: true,
        lastName: true,
        email: true,
        avatarUrl: true,
        sessions: { orderBy: { lastSeenAt: "desc" } },
        memberships: {
          orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
          include: {
            department: { select: { name: true, shortName: true, color: true } },
            grade: { select: { name: true } },
          },
        },
      },
    }),
    currentSessionId(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <UserAvatar
          firstName={user.firstName}
          lastName={user.lastName}
          avatarUrl={user.avatarUrl}
          size="lg"
          className="size-14"
        />
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Mon compte</h1>
          <p className="text-sm text-muted-foreground">Vos coordonnées, affectations et accès.</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Identité et profil</CardTitle></CardHeader>
          <CardContent className="flex flex-col gap-5">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="firstName">Prénom</Label>
                <Input id="firstName" value={user.firstName} readOnly disabled />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="lastName">Nom</Label>
                <Input id="lastName" value={user.lastName} readOnly disabled />
              </div>
            </div>
            <ProfileForm email={user.email} avatarUrl={user.avatarUrl} />
          </CardContent>
        </Card>

        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader><CardTitle>Affectations</CardTitle></CardHeader>
            <CardContent className="flex flex-col gap-3">
              {user.memberships.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aucune affectation.</p>
              ) : user.memberships.map((membership) => (
                <div key={membership.id} className="flex items-center justify-between gap-3 rounded-md border p-3">
                  <div className="flex items-center gap-3">
                    <span className="size-2 rounded-full" style={{ backgroundColor: membership.department.color }} />
                    <div>
                      <p className="text-sm font-medium">
                        {membership.department.name} — {membership.grade.name}
                      </p>
                      <p className="font-mono text-xs text-muted-foreground">
                        {membership.department.shortName} #{membership.badgeNumber}
                        {membership.callsign ? ` · ${membership.callsign}` : ""}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {membership.isPrimary ? <Badge variant="secondary">Principale</Badge> : null}
                    <Badge variant="outline">{STATUS_LABELS[membership.status] ?? membership.status}</Badge>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Mot de passe</CardTitle></CardHeader>
            <CardContent><ChangePasswordForm /></CardContent>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle>Sécurité</CardTitle></CardHeader>
        <CardContent>
          <SessionsSection
            userId={actor.id}
            sessions={user.sessions}
            currentSessionId={activeSessionId}
          />
        </CardContent>
      </Card>
    </div>
  );
}
