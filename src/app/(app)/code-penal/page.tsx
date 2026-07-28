import type { Metadata } from "next";
import { requireActor, requirePagePermission, can } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { OFFENSE_TYPE_LABELS, formatJailTime, formatMoney } from "@/lib/labels";
import {
  CreateCategoryDialog,
  EditCategoryDialog,
  DeleteCategoryButton,
  CreateOffenseDialog,
  EditOffenseDialog,
  DeleteOffenseButton,
} from "./penal-code-dialogs";

export const metadata: Metadata = { title: "Code pénal — MDT" };

export default async function CodePenalPage() {
  const actor = await requireActor();
  requirePagePermission(actor, "penalcode.view");

  const canEdit = can(actor, "penalcode.edit");
  const categories = await prisma.penalCategory.findMany({
    orderBy: { order: "asc" },
    include: { offenses: { orderBy: { code: "asc" } } },
  });

  const categoryOptions = categories.map((category) => ({ id: category.id, name: category.name }));
  const totalOffenses = categories.reduce((sum, category) => sum + category.offenses.length, 0);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Code pénal</h1>
          <p className="text-muted-foreground">
            {totalOffenses} infraction{totalOffenses > 1 ? "s" : ""} en {categories.length} catégorie
            {categories.length > 1 ? "s" : ""}.
          </p>
        </div>
        {canEdit ? (
          <div className="flex gap-2">
            <CreateCategoryDialog />
            {categoryOptions.length > 0 ? <CreateOffenseDialog categories={categoryOptions} /> : null}
          </div>
        ) : null}
      </div>

      {categories.length === 0 ? (
        <p className="rounded-md border border-dashed border-border p-8 text-center text-muted-foreground">
          Le code pénal est vide. Créez une catégorie pour commencer à y ajouter des infractions.
        </p>
      ) : (
        <div className="flex flex-col gap-6">
          {categories.map((category) => (
            <section key={category.id} className="flex flex-col gap-3">
              <div className="flex items-center justify-between gap-3 border-b border-border pb-2">
                <h2 className="font-medium">{category.name}</h2>
                {canEdit ? (
                  <div className="flex items-center gap-1">
                    <CreateOffenseDialog categories={categoryOptions} defaultCategoryId={category.id} />
                    <EditCategoryDialog
                      category={{ id: category.id, name: category.name, order: category.order }}
                    />
                    <DeleteCategoryButton categoryId={category.id} />
                  </div>
                ) : null}
              </div>

              {category.offenses.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aucune infraction dans cette catégorie.</p>
              ) : (
                <div className="overflow-x-auto rounded-md border border-border">
                  <table className="w-full text-sm">
                    <thead className="border-b border-border text-left text-muted-foreground">
                      <tr>
                        <th className="p-2 font-medium">Code</th>
                        <th className="p-2 font-medium">Intitulé</th>
                        <th className="p-2 font-medium">Qualification</th>
                        <th className="p-2 text-right font-medium">Amende</th>
                        <th className="p-2 text-right font-medium">Prison</th>
                        <th className="p-2 text-right font-medium">Points</th>
                        {canEdit ? <th className="w-20 p-2" /> : null}
                      </tr>
                    </thead>
                    <tbody>
                      {category.offenses.map((offense) => (
                        <tr key={offense.id} className="border-b border-border last:border-0">
                          <td className="p-2 font-mono whitespace-nowrap">{offense.code}</td>
                          <td className="p-2">
                            <span className={offense.isActive ? "" : "text-muted-foreground line-through"}>
                              {offense.name}
                            </span>
                            {!offense.isActive ? (
                              <Badge variant="outline" className="ml-2">
                                Inactive
                              </Badge>
                            ) : null}
                          </td>
                          <td className="p-2 text-muted-foreground">
                            {OFFENSE_TYPE_LABELS[offense.type] ?? offense.type}
                          </td>
                          <td className="p-2 text-right font-mono">{formatMoney(offense.fine)}</td>
                          <td className="p-2 text-right font-mono">{formatJailTime(offense.jailMinutes)}</td>
                          <td className="p-2 text-right font-mono">{offense.points || "—"}</td>
                          {canEdit ? (
                            <td className="p-2">
                              <div className="flex justify-end gap-1">
                                <EditOffenseDialog
                                  categories={categoryOptions}
                                  offense={{
                                    id: offense.id,
                                    code: offense.code,
                                    name: offense.name,
                                    description: offense.description,
                                    categoryId: offense.categoryId,
                                    type: offense.type,
                                    fine: offense.fine,
                                    jailMinutes: offense.jailMinutes,
                                    points: offense.points,
                                    bail: offense.bail,
                                    isActive: offense.isActive,
                                  }}
                                />
                                <DeleteOffenseButton offenseId={offense.id} />
                              </div>
                            </td>
                          ) : null}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
