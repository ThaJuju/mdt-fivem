import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireActor, requirePagePermission } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ProfileForm } from "./profile-form";
import { ResetPasswordForm } from "./reset-password-form";
import { MembershipsSection } from "./memberships-section";
import { DeleteUserButton } from "./delete-user-button";

export const metadata: Metadata = { title: "Détail du compte — Administration — MDT" };

export default async function UserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const actor = await requireActor();
  requirePagePermission(actor, "admin.users.manage");

  const { id } = await params;

  const [user, departments] = await Promise.all([
    prisma.user.findUnique({
      where: { id },
      include: {
        memberships: {
          orderBy: { createdAt: "asc" },
          include: { department: true, grade: true },
        },
      },
    }),
    prisma.department.findMany({
      orderBy: { order: "asc" },
      include: { grades: { select: { id: true, name: true, level: true } } },
    }),
  ]);

  if (!user) notFound();

  await audit(actor, "user.view", { entity: "User", entityId: user.id });

  const isSelf = user.id === actor.id;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">
          {user.firstName} {user.lastName}
        </h1>
        <span className="font-mono text-sm text-muted-foreground">@{user.username}</span>
        {user.isSuperAdmin ? <Badge variant="secondary">Super-admin</Badge> : null}
        {!user.isActive ? <Badge variant="outline">Inactif</Badge> : null}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Profil</CardTitle>
          </CardHeader>
          <CardContent>
            <ProfileForm
              user={{
                id: user.id,
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                isActive: user.isActive,
                isSuperAdmin: user.isSuperAdmin,
              }}
              isSelf={isSelf}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Mot de passe</CardTitle>
          </CardHeader>
          <CardContent>
            <ResetPasswordForm userId={user.id} />
          </CardContent>
        </Card>
      </div>

      <MembershipsSection
        userId={user.id}
        memberships={user.memberships.map((membership) => ({
          id: membership.id,
          departmentId: membership.departmentId,
          departmentShortName: membership.department.shortName,
          departmentColor: membership.department.color,
          gradeId: membership.gradeId,
          gradeName: membership.grade.name,
          badgeNumber: membership.badgeNumber,
          callsign: membership.callsign,
          isPrimary: membership.isPrimary,
          status: membership.status,
        }))}
        departments={departments.map((department) => ({
          id: department.id,
          name: department.name,
          shortName: department.shortName,
          grades: department.grades,
        }))}
      />

      {!isSelf ? (
        <div>
          <DeleteUserButton userId={user.id} username={user.username} />
        </div>
      ) : null}
    </div>
  );
}
