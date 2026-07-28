"use client";

import { useState } from "react";
import { Pencil, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { LicenseForm, type ExistingLicense } from "./license-form";

export function AddLicenseDialog({ citizenId }: { citizenId: string }) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Plus className="size-4" />
          Ajouter une licence
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ajouter une licence</DialogTitle>
        </DialogHeader>
        <LicenseForm citizenId={citizenId} onSuccess={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}

export function EditLicenseDialog({ citizenId, license }: { citizenId: string; license: ExistingLicense }) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="ghost" title="Modifier">
          <Pencil className="size-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Modifier la licence</DialogTitle>
        </DialogHeader>
        <LicenseForm citizenId={citizenId} license={license} onSuccess={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}
