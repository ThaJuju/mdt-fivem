import type { Metadata } from "next";
import { requireActor, requirePagePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parsePageParams, pageCount } from "@/lib/pagination";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CreateStatusCodeDialog, EditStatusCodeDialog } from "./status-code-dialogs";
import { DeleteStatusCodeButton } from "./delete-status-code-button";
import { CodesPagination } from "./codes-pagination";

export const metadata: Metadata = { title: "10-codes — Administration — MDT" };

export default async function CodesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const actor = await requireActor();
  requirePagePermission(actor, "admin.codes.manage");

  const params = await searchParams;
  const { page, pageSize, skip, take } = parsePageParams(params, 50);
  const [statusCodes, total] = await Promise.all([
    prisma.statusCode.findMany({ orderBy: { order: "asc" }, skip, take }),
    prisma.statusCode.count(),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground">
          {total} code{total > 1 ? "s" : ""}
        </p>
        <CreateStatusCodeDialog />
      </div>

      {statusCodes.length === 0 ? (
        <p className="rounded-md border border-dashed border-border p-8 text-center text-muted-foreground">
          Aucun 10-code. Ajoutez-en un pour l&apos;utiliser dans le dispatch.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-md border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Libellé</TableHead>
                <TableHead>Catégorie</TableHead>
                <TableHead className="w-24" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {statusCodes.map((statusCode) => (
                <TableRow key={statusCode.id}>
                  <TableCell>
                    <span
                      className="rounded-sm px-1.5 py-0.5 font-mono text-sm font-semibold"
                      style={{ color: statusCode.color }}
                    >
                      {statusCode.code}
                    </span>
                  </TableCell>
                  <TableCell>{statusCode.label}</TableCell>
                  <TableCell className="text-muted-foreground">{statusCode.type ?? "—"}</TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <EditStatusCodeDialog
                        statusCode={{
                          id: statusCode.id,
                          code: statusCode.code,
                          label: statusCode.label,
                          color: statusCode.color,
                          type: statusCode.type,
                          order: statusCode.order,
                        }}
                      />
                      <DeleteStatusCodeButton id={statusCode.id} />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <CodesPagination page={page} pageCount={pageCount(total, pageSize)} total={total} />
    </div>
  );
}
