import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { NoteForm } from "./note-form";
import { DeleteNoteButton } from "./delete-note-button";

export type NoteRow = {
  id: string;
  content: string;
  isFlagged: boolean;
  createdAt: Date;
  authorName: string;
};

export function NotesSection({
  citizenId,
  notes,
  canCreate,
  canDelete,
}: {
  citizenId: string;
  notes: NoteRow[];
  canCreate: boolean;
  canDelete: boolean;
}) {
  return (
    <div className="flex flex-col gap-3">
      <h2 className="font-medium">Notes</h2>
      {notes.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aucune note pour ce citoyen. Consignez ici ce qu&apos;un collègue doit savoir avant un contrôle.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {notes.map((note) => (
            <div key={note.id} className="flex items-start justify-between gap-3 rounded-md border border-border bg-card p-3">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  {note.isFlagged ? (
                    <Badge className="bg-department text-department-foreground">Signalée</Badge>
                  ) : null}
                  <span className="text-xs text-muted-foreground">
                    {note.authorName} · {format(note.createdAt, "dd/MM/yyyy HH:mm", { locale: fr })}
                  </span>
                </div>
                <p className="text-sm whitespace-pre-wrap">{note.content}</p>
              </div>
              {canDelete ? <DeleteNoteButton citizenId={citizenId} noteId={note.id} /> : null}
            </div>
          ))}
        </div>
      )}
      {canCreate ? <NoteForm citizenId={citizenId} /> : null}
    </div>
  );
}
