"use client";

import { useState } from "react";
import { Pencil, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { StatusCodeForm, type ExistingStatusCode } from "./status-code-form";

export function CreateStatusCodeDialog() {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="size-4" />
          Ajouter un code
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ajouter un 10-code</DialogTitle>
        </DialogHeader>
        <StatusCodeForm onSuccess={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}

export function EditStatusCodeDialog({ statusCode }: { statusCode: ExistingStatusCode }) {
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
          <DialogTitle>Modifier le 10-code</DialogTitle>
        </DialogHeader>
        <StatusCodeForm statusCode={statusCode} onSuccess={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}
