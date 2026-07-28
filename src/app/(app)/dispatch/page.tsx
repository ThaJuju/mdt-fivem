import type { Metadata } from "next";
import { requireActor, requirePagePermission, can } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { DispatchBoard } from "./dispatch-board";
import type { CallRow, UnitRow } from "./types";

export const metadata: Metadata = { title: "Dispatch — MDT" };

export default async function DispatchPage() {
  const actor = await requireActor();
  requirePagePermission(actor, "dispatch.view");

  const [calls, units, statusCodes] = await Promise.all([
    prisma.call.findMany({
      where: { status: { not: "CLOSED" } },
      orderBy: [{ priority: "asc" }, { createdAt: "asc" }],
      take: 50,
      include: {
        units: { include: { unit: { select: { id: true, callsign: true, status: true } } } },
        logs: {
          orderBy: { createdAt: "desc" },
          take: 20,
          include: { author: { select: { firstName: true, lastName: true } } },
        },
      },
    }),
    prisma.unit.findMany({
      where: { isActive: true },
      orderBy: { callsign: "asc" },
      include: {
        members: { include: { user: { select: { id: true, firstName: true, lastName: true } } } },
        calls: { include: { call: { select: { number: true } } } },
      },
    }),
    prisma.statusCode.findMany({ orderBy: { order: "asc" } }),
  ]);

  await audit(actor, "dispatch.view");

  const callRows: CallRow[] = calls.map((call) => ({
    id: call.id,
    number: call.number,
    source: call.source,
    code: call.code,
    priority: call.priority,
    title: call.title,
    description: call.description,
    location: call.location,
    postal: call.postal,
    callerName: call.callerName,
    callerPhone: call.callerPhone,
    status: call.status,
    tags: call.tags,
    createdAt: call.createdAt.toISOString(),
    units: call.units.map((callUnit) => ({
      id: callUnit.unit.id,
      callsign: callUnit.unit.callsign,
      status: callUnit.unit.status,
    })),
    logs: call.logs
      .map((log) => ({
        id: log.id,
        message: log.message,
        authorName: log.author ? `${log.author.firstName} ${log.author.lastName}` : null,
        createdAt: log.createdAt.toISOString(),
      }))
      .reverse(),
  }));

  const unitRows: UnitRow[] = units.map((unit) => ({
    id: unit.id,
    callsign: unit.callsign,
    type: unit.type,
    status: unit.status,
    members: unit.members.map((member) => ({
      userId: member.user.id,
      name: `${member.user.firstName} ${member.user.lastName}`,
      isLead: member.isLead,
    })),
    assignedCallNumbers: unit.calls.map((callUnit) => callUnit.call.number),
  }));

  return (
    <DispatchBoard
      calls={callRows}
      units={unitRows}
      statusCodes={statusCodes.map((s) => ({ code: s.code, label: s.label, color: s.color }))}
      actorId={actor.id}
      canCreate={can(actor, "dispatch.calls.create")}
      canEdit={can(actor, "dispatch.calls.edit")}
      canClose={can(actor, "dispatch.calls.close")}
      canAssign={can(actor, "dispatch.units.assign")}
      canManageUnits={can(actor, "dispatch.units.manage")}
    />
  );
}
