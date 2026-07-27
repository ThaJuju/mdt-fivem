"use client";

import { useState, type FormEvent } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export function AuditFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [action, setAction] = useState(searchParams.get("action") ?? "");
  const [entity, setEntity] = useState(searchParams.get("entity") ?? "");
  const [user, setUser] = useState(searchParams.get("user") ?? "");
  const [from, setFrom] = useState(searchParams.get("from") ?? "");
  const [to, setTo] = useState(searchParams.get("to") ?? "");

  function applyFilters(event: FormEvent) {
    event.preventDefault();
    const params = new URLSearchParams();
    if (action) params.set("action", action);
    if (entity) params.set("entity", entity);
    if (user) params.set("user", user);
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    params.set("page", "1");
    router.push(`${pathname}?${params.toString()}`);
  }

  function reset() {
    setAction("");
    setEntity("");
    setUser("");
    setFrom("");
    setTo("");
    router.push(pathname);
  }

  const hasFilters = Boolean(action || entity || user || from || to);

  return (
    <form
      onSubmit={applyFilters}
      className="flex flex-wrap items-end gap-3 rounded-md border border-border bg-card p-4"
    >
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="filter-user">Utilisateur</Label>
        <Input
          id="filter-user"
          value={user}
          onChange={(event) => setUser(event.target.value)}
          placeholder="identifiant"
          className="w-40 font-mono"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="filter-action">Action</Label>
        <Input
          id="filter-action"
          value={action}
          onChange={(event) => setAction(event.target.value)}
          placeholder="citizen.view"
          className="w-44 font-mono"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="filter-entity">Entité</Label>
        <Input
          id="filter-entity"
          value={entity}
          onChange={(event) => setEntity(event.target.value)}
          placeholder="Citizen"
          className="w-32 font-mono"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="filter-from">Du</Label>
        <Input id="filter-from" type="date" value={from} onChange={(event) => setFrom(event.target.value)} className="w-40" />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="filter-to">Au</Label>
        <Input id="filter-to" type="date" value={to} onChange={(event) => setTo(event.target.value)} className="w-40" />
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
