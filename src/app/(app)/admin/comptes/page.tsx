import type { Metadata } from "next";
import type { Prisma } from "@prisma/client";
import { requireActor, assertCan } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parsePageParams, pageCount } from "@/lib/pagination";
import { DataTable } from "@/components/data-table";
import { SearchBox } from "@/components/search-box";
import { columns, type UserRow } from "./columns";
import { CreateUserDialog } from "./create-user-dialog";

export const metadata: Metadata = { title: "Comptes — Administration — MDT" };

export default async function ComptesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const actor = await requireActor();
  assertCan(actor, "admin.users.manage");

  const params = await searchParams;
  const { page, pageSize, skip, take } = parsePageParams(params, 25);
  const q = typeof params.q === "string" ? params.q : undefined;
  const sortField = params.sort === "username" ? "username" : "lastName";
  const sortDir = params.dir === "desc" ? "desc" : "asc";
  const orderBy: Prisma.UserOrderByWithRelationInput =
    sortField === "username" ? { username: sortDir } : { lastName: sortDir };

  const where: Prisma.UserWhereInput = q
    ? {
        OR: [
          { username: { contains: q, mode: "insensitive" } },
          { firstName: { contains: q, mode: "insensitive" } },
          { lastName: { contains: q, mode: "insensitive" } },
        ],
      }
    : {};

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy,
      skip,
      take,
      include: {
        memberships: {
          where: { isPrimary: true },
          include: { department: true, grade: true },
          take: 1,
        },
      },
    }),
    prisma.user.count({ where }),
  ]);

  const rows: UserRow[] = users.map((user) => ({
    id: user.id,
    username: user.username,
    firstName: user.firstName,
    lastName: user.lastName,
    isActive: user.isActive,
    isSuperAdmin: user.isSuperAdmin,
    primaryMembership: user.memberships[0]
      ? {
          departmentShortName: user.memberships[0].department.shortName,
          departmentColor: user.memberships[0].department.color,
          gradeName: user.memberships[0].grade.name,
        }
      : null,
  }));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <SearchBox placeholder="Rechercher un compte…" />
        <CreateUserDialog />
      </div>
      <DataTable
        columns={columns}
        data={rows}
        page={page}
        pageCount={pageCount(total, pageSize)}
        total={total}
        emptyState="Aucun compte ne correspond à cette recherche."
      />
    </div>
  );
}
