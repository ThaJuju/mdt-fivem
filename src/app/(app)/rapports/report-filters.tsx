"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { REPORT_TYPE_LABELS, REPORT_STATUS_LABELS } from "@/lib/labels";

const ALL = "__all__";

export function ReportFilters({ canViewAll }: { canViewAll: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function setParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === ALL) params.delete(key);
    else params.set(key, value);
    params.set("page", "1");
    router.push(`${pathname}?${params.toString()}`);
  }

  const type = searchParams.get("type") ?? ALL;
  const status = searchParams.get("status") ?? ALL;
  const scope = searchParams.get("scope") ?? ALL;
  const hasFilters = type !== ALL || status !== ALL || scope !== ALL;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select value={type} onValueChange={(value) => setParam("type", value)}>
        <SelectTrigger className="w-52">
          <SelectValue placeholder="Tous les types" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>Tous les types</SelectItem>
          {Object.entries(REPORT_TYPE_LABELS).map(([value, label]) => (
            <SelectItem key={value} value={value}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={status} onValueChange={(value) => setParam("status", value)}>
        <SelectTrigger className="w-52">
          <SelectValue placeholder="Tous les statuts" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>Tous les statuts</SelectItem>
          {Object.entries(REPORT_STATUS_LABELS).map(([value, label]) => (
            <SelectItem key={value} value={value}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {canViewAll ? (
        <Select value={scope} onValueChange={(value) => setParam("scope", value)}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Tous les rapports</SelectItem>
            <SelectItem value="mine">Mes rapports</SelectItem>
          </SelectContent>
        </Select>
      ) : null}

      {hasFilters ? (
        <Button variant="ghost" size="sm" onClick={() => router.push(pathname)}>
          <X className="size-4" />
          Réinitialiser
        </Button>
      ) : null}
    </div>
  );
}
