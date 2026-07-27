"use client";

import { useState } from "react";
import { Pencil, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { MembershipForm, type DepartmentOption, type ExistingMembership } from "./membership-form";

export function AddMembershipDialog({
  userId,
  departments,
}: {
  userId: string;
  departments: DepartmentOption[];
}) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Plus className="size-4" />
          Ajouter une affectation
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ajouter une affectation</DialogTitle>
        </DialogHeader>
        <MembershipForm userId={userId} departments={departments} onSuccess={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}

export function EditMembershipDialog({
  userId,
  departments,
  membership,
}: {
  userId: string;
  departments: DepartmentOption[];
  membership: ExistingMembership;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="ghost" title="Modifier l'affectation">
          <Pencil className="size-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Modifier l&apos;affectation</DialogTitle>
        </DialogHeader>
        <MembershipForm
          userId={userId}
          departments={departments}
          membership={membership}
          onSuccess={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
