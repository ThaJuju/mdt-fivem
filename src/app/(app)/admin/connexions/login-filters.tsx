"use client";

import { useState, type FormEvent } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export function LoginFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [identifier, setIdentifier] = useState(searchParams.get("identifiant") ?? "");
  const [ip, setIp] = useState(searchParams.get("ip") ?? "");
  const [issue, setIssue] = useState(searchParams.get("issue") ?? "echec");

  function applyFilters(event: FormEvent) {
    event.preventDefault();
    const params = new URLSearchParams();
    if (identifier) params.set("identifiant", identifier);
    if (ip) params.set("ip", ip);
    if (issue) params.set("issue", issue);
    params.set("page", "1");
    router.push(`${pathname}?${params.toString()}`);
  }

  function reset() {
    setIdentifier("");
    setIp("");
    setIssue("echec");
    router.push(pathname);
  }

  const hasFilters = Boolean(identifier || ip) || issue !== "echec";

  return (
    <form
      onSubmit={applyFilters}
      className="flex flex-wrap items-end gap-3 rounded-md border border-border bg-card p-4"
    >
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="filter-identifiant">Identifiant saisi</Label>
        <Input
          id="filter-identifiant"
          value={identifier}
          onChange={(event) => setIdentifier(event.target.value)}
          placeholder="jdupont"
          className="w-44 font-mono"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="filter-ip">Adresse</Label>
        <Input
          id="filter-ip"
          value={ip}
          onChange={(event) => setIp(event.target.value)}
          placeholder="203.0.113.7"
          className="w-40 font-mono"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="filter-issue">Issue</Label>
        <select
          id="filter-issue"
          value={issue}
          onChange={(event) => setIssue(event.target.value)}
          className="h-9 w-36 rounded-md border border-input bg-transparent px-3 text-sm shadow-xs"
        >
          <option value="echec">Échouées</option>
          <option value="succes">Réussies</option>
          <option value="toutes">Toutes</option>
        </select>
      </div>
      <Button type="submit" size="sm">
        Filtrer
      </Button>
      {hasFilters ? (
        <Button type="button" variant="ghost" size="sm" onClick={reset}>
          <X className="size-4" />
          Réinitialiser
        </Button>
      ) : null}
    </form>
  );
}
