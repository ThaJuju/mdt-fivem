"use client";

import { useState } from "react";
import { Pencil, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { GradeForm, type ExistingGrade } from "./grade-form";

export function AddGradeDialog({ departmentId }: { departmentId: string }) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Plus className="size-4" />
          Ajouter un grade
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh]">
        <DialogHeader>
          <DialogTitle>Ajouter un grade</DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[65vh] pr-4">
          <GradeForm departmentId={departmentId} onSuccess={() => setOpen(false)} />
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

export function EditGradeDialog({ departmentId, grade }: { departmentId: string; grade: ExistingGrade }) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="ghost" title="Modifier le grade">
          <Pencil className="size-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh]">
        <DialogHeader>
          <DialogTitle>Modifier le grade</DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[65vh] pr-4">
          <GradeForm departmentId={departmentId} grade={grade} onSuccess={() => setOpen(false)} />
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
