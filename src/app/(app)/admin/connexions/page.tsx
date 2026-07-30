import type { Metadata } from "next";
import type { Prisma } from "@prisma/client";
import { requireActor, requirePagePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parsePageParams, pageCount } from "@/lib/pagination";
import { LoginFilters } from "./login-filters";
import type { LoginAttemptRow } from "./columns";
import { LoginAttemptsTable } from "./login-attempts-table";

export const metadata: Metadata = { title: "Tentatives de connexion — Administration — MDT" };

/**
 * Les tentatives de connexion n'étaient visibles nulle part : on ne pouvait
 * ni constater qu'un compte se faisait marteler, ni distinguer un agent qui
 * a oublié son mot de passe d'un balayage d'identifiants.
 *
 * Le filtre par défaut porte sur les échecs — c'est ce qu'on vient chercher.
 */
export default async function LoginAttemptsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const actor = await requireActor();
  requirePagePermission(actor, "admin.audit.view");

  const params = await searchParams;
  const { page, pageSize, skip, take } = parsePageParams(params, 50);

  const identifierFilter =
    typeof params.identifiant === "string" && params.identifiant ? params.identifiant : undefined;
  const ipFilter = typeof params.ip === "string" && params.ip ? params.ip : undefined;
  const issue = typeof params.issue === "string" ? params.issue : "echec";

  const where: Prisma.LoginAttemptWhereInput = {
    ...(identifierFilter ? { identifier: { contains: identifierFilter, mode: "insensitive" } } : {}),
    ...(ipFilter ? { ip: { contains: ipFilter } } : {}),
    ...(issue === "toutes" ? {} : { succeeded: issue === "succes" }),
  };

  const [attempts, total] = await Promise.all([
    prisma.loginAttempt.findMany({ where, orderBy: { createdAt: "desc" }, skip, take }),
    prisma.loginAttempt.count({ where }),
  ]);

  /**
   * Un identifiant qui ne correspond à aucun compte est le signe le plus net
   * d'un balayage : autant le dire dans le tableau plutôt que de laisser
   * l'administrateur vérifier compte par compte. Une seule requête pour toute
   * la page.
   */
  const identifiers = [...new Set(attempts.map((attempt) => attempt.identifier))];
  const known = identifiers.length
    ? await prisma.user.findMany({
        where: { username: { in: identifiers, mode: "insensitive" } },
        select: { username: true },
      })
    : [];
  const knownUsernames = new Set(known.map((user) => user.username.toLowerCase()));

  const rows: LoginAttemptRow[] = attempts.map((attempt) => ({
    id: attempt.id,
    createdAt: attempt.createdAt,
    identifier: attempt.identifier,
    ip: attempt.ip,
    succeeded: attempt.succeeded,
    accountExists: knownUsernames.has(attempt.identifier.toLowerCase()),
  }));

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        Conservées trente jours. La limitation de débit s&apos;appuie sur ces mêmes tentatives pour
        retrouver ses compteurs après un redémarrage.
      </p>
      <LoginFilters />
      <LoginAttemptsTable data={rows} page={page} pageCount={pageCount(total, pageSize)} total={total} />
    </div>
  );
}
