import { NextResponse } from "next/server";
import { can, getActor } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { resolveShiftPeriod, shiftHoursByAgent } from "../shift-reporting";

function csvCell(value: string | number): string {
  let text = String(value);
  if (/^[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}

export async function GET(request: Request) {
  const actor = await getActor();
  if (!actor) return NextResponse.json({ error: "Authentification requise." }, { status: 401 });
  if (!can(actor, "hr.roster.view")) {
    return NextResponse.json({ error: "Permission insuffisante." }, { status: 403 });
  }

  const url = new URL(request.url);
  const params = Object.fromEntries(url.searchParams.entries());
  const period = resolveShiftPeriod(params);
  const rows = await shiftHoursByAgent(actor, period.start, period.end);
  const lines = [
    ["Agent", "Service", "Début", "Fin", "Heures"].map(csvCell).join(";"),
    ...rows.map((row) =>
      [
        row.userName,
        row.departmentShortName,
        period.startInput,
        period.endInput,
        row.hours.toFixed(2).replace(".", ","),
      ].map(csvCell).join(";"),
    ),
  ];

  await audit(actor, "shift.export", {
    entity: "Shift",
    metadata: { start: period.startInput, end: period.endInput, rows: rows.length },
  });

  return new NextResponse(`\uFEFF${lines.join("\r\n")}\r\n`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="heures-${period.startInput}-${period.endInput}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
