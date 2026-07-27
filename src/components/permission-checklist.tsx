"use client";

import { useState } from "react";
import { PERMISSIONS_CATALOG } from "@/lib/permissions";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

/**
 * Génère les cases à cocher depuis PERMISSIONS_CATALOG : ajouter une entrée
 * au catalogue suffit à la rendre attribuable ici, sans autre modification.
 * Les cases partagent `name` — la valeur soumise est `formData.getAll(name)`.
 */
export function PermissionChecklist({
  name,
  defaultValue = [],
}: {
  name: string;
  defaultValue?: string[];
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set(defaultValue));

  function toggle(permission: string, checked: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(permission);
      else next.delete(permission);
      return next;
    });
  }

  function toggleDomain(permissions: string[], checked: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      for (const key of permissions) {
        if (checked) next.add(key);
        else next.delete(key);
      }
      return next;
    });
  }

  return (
    <div className="flex flex-col divide-y divide-border rounded-md border border-border">
      {PERMISSIONS_CATALOG.map((domain) => {
        const domainPermissions = domain.permissions.map((permission) => `${domain.key}.${permission.key}`);
        const allChecked = domainPermissions.every((permission) => selected.has(permission));
        const someChecked = domainPermissions.some((permission) => selected.has(permission));

        return (
          <div key={domain.key} className="p-3">
            <div className="mb-2 flex items-center gap-2">
              <Checkbox
                id={`domain-${domain.key}`}
                checked={allChecked ? true : someChecked ? "indeterminate" : false}
                onCheckedChange={(checked) => toggleDomain(domainPermissions, checked === true)}
              />
              <Label htmlFor={`domain-${domain.key}`} className="font-medium">
                {domain.label}
              </Label>
            </div>
            <div className="grid grid-cols-1 gap-1.5 pl-6 sm:grid-cols-2">
              {domain.permissions.map((permission) => {
                const full = `${domain.key}.${permission.key}`;
                return (
                  <div key={full} className="flex items-center gap-2">
                    <Checkbox
                      id={full}
                      name={name}
                      value={full}
                      checked={selected.has(full)}
                      onCheckedChange={(checked) => toggle(full, checked === true)}
                    />
                    <Label htmlFor={full} className="text-sm font-normal">
                      {permission.label}
                    </Label>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
