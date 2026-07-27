import type { Metadata } from "next";
import { requireActor, assertCan } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CreateStatusCodeDialog, EditStatusCodeDialog } from "./status-code-dialogs";
import { DeleteStatusCodeButton } from "./delete-status-code-button";

export const metadata: Metadata = { title: "10-codes — Administration — MDT" };

export default async function CodesPage() {
  const actor = await requireActor();
  assertCan(actor, "admin.codes.manage");

  const statusCodes = await prisma.statusCode.findMany({ orderBy: { order: "asc" } });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground">
          {statusCodes.length} code{statusCodes.length > 1 ? "s" : ""}
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
    </div>
  );
}
