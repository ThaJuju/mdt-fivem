import "server-only";

import { Prisma } from "@prisma/client";
import type { Actor } from "@/lib/auth";
import { can } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export type ShiftPeriod = {
  preset: "week" | "month" | "custom";
  start: Date;
  end: Date;
  startInput: string;
  endInput: string;
};

export type ShiftHoursRow = {
  userId: string;
  userName: string;
  departmentShortName: string;
  hours: number;
};

function localDay(value: string | undefined): Date | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function dateInput(date: Date): string {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

export function resolveShiftPeriod(params: Record<string, string | string[] | undefined>): ShiftPeriod {
  const now = new Date();
  const preset = params.period === "week" || params.period === "custom" ? params.period : "month";
  let start: Date;
  let end: Date;

  if (preset === "week") {
    start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const day = start.getDay() || 7;
    start.setDate(start.getDate() - day + 1);
    end = new Date(start);
    end.setDate(end.getDate() + 7);
  } else if (preset === "custom") {
    start = localDay(typeof params.start === "string" ? params.start : undefined)
      ?? new Date(now.getFullYear(), now.getMonth(), 1);
    const selectedEnd = localDay(typeof params.end === "string" ? params.end : undefined) ?? now;
    end = new Date(selectedEnd);
    end.setDate(end.getDate() + 1);
    if (end <= start) {
      end = new Date(start);
      end.setDate(end.getDate() + 1);
    }
  } else {
    start = new Date(now.getFullYear(), now.getMonth(), 1);
    end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  }

  const inclusiveEnd = new Date(end);
  inclusiveEnd.setDate(inclusiveEnd.getDate() - 1);
  return { preset, start, end, startInput: dateInput(start), endInput: dateInput(inclusiveEnd) };
}

function visibilitySql(actor: Actor): Prisma.Sql {
  if (actor.isSuperAdmin) return Prisma.sql`TRUE`;
  if (!can(actor, "hr.shifts.view")) return Prisma.sql`s."userId" = ${actor.id}`;
  const departmentIds = actor.memberships
    .filter((membership) => membership.status === "ACTIVE")
    .map((membership) => membership.departmentId);
  if (departmentIds.length === 0) return Prisma.sql`FALSE`;
  return Prisma.sql`s."departmentId" IN (${Prisma.join(departmentIds)})`;
}

export async function shiftHoursByAgent(
  actor: Actor,
  start: Date,
  end: Date,
): Promise<ShiftHoursRow[]> {
  const rows = await prisma.$queryRaw<
    { userId: string; firstName: string; lastName: string; departmentShortName: string; hours: unknown }[]
  >(Prisma.sql`
    SELECT
      s."userId",
      u."firstName",
      u."lastName",
      d."shortName" AS "departmentShortName",
      SUM(EXTRACT(EPOCH FROM (s."endedAt" - s."startedAt"))) / 3600 AS hours
    FROM "Shift" s
    INNER JOIN "User" u ON u.id = s."userId"
    INNER JOIN "Department" d ON d.id = s."departmentId"
    WHERE s."endedAt" IS NOT NULL
      AND s."startedAt" >= ${start}
      AND s."startedAt" < ${end}
      AND ${visibilitySql(actor)}
    GROUP BY s."userId", u."firstName", u."lastName", d."shortName"
    ORDER BY u."lastName", u."firstName", d."shortName"
  `);

  return rows.map((row) => ({
    userId: row.userId,
    userName: `${row.lastName} ${row.firstName}`,
    departmentShortName: row.departmentShortName,
    hours: Number(row.hours),
  }));
}

export async function totalShiftHours(actor: Actor, start: Date, end: Date): Promise<number> {
  const rows = await prisma.$queryRaw<{ hours: unknown }[]>(Prisma.sql`
    SELECT COALESCE(SUM(EXTRACT(EPOCH FROM (s."endedAt" - s."startedAt"))) / 3600, 0) AS hours
    FROM "Shift" s
    WHERE s."endedAt" IS NOT NULL
      AND s."startedAt" >= ${start}
      AND s."startedAt" < ${end}
      AND ${visibilitySql(actor)}
  `);
  return Number(rows[0]?.hours ?? 0);
}
