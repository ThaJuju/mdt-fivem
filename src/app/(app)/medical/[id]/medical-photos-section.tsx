"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { MultiImageField } from "@/components/multi-image-field";
import { MedicalPhotoGallery } from "@/components/medical-photo-gallery";
import { addMedicalPhotos, type FormState } from "../actions";

const initialState: FormState = {};

export function MedicalPhotosSection({
  citizenId,
  photos,
  canEdit,
}: {
  citizenId: string;
  photos: { id: string; url: string }[];
  canEdit: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, isPending] = useActionState(addMedicalPhotos, initialState);
  const router = useRouter();

  useEffect(() => {
    if (state.error) toast.error(state.error);
    if (state !== initialState && !state.error && !state.fieldErrors) {
      toast.success("Photographies ajoutées au dossier.");
      setOpen(false);
      router.refresh();
    }
  }, [router, state]);

  return (
    <Card>
      <CardHeader className="border-b border-border/70 pb-4">
        <div>
          <p className="eyebrow">Documents cliniques</p>
          <CardTitle className="mt-1">Photographies médicales</CardTitle>
        </div>
        {canEdit ? (
          <CardAction>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm"><ImagePlus className="size-3.5" />Ajouter des photos</Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-xl">
                <DialogHeader><DialogTitle>Ajouter des photographies médicales</DialogTitle></DialogHeader>
                <form action={formAction} className="flex flex-col gap-4">
                  <input type="hidden" name="citizenId" value={citizenId} />
                  <div className="flex flex-col gap-2">
                    <Label>Photos</Label>
                    <MultiImageField name="photoUrls" />
                    <p className="text-xs text-muted-foreground">Coller, déposer ou sélectionner plusieurs images.</p>
                  </div>
                  <Button type="submit" disabled={isPending} className="w-fit">
                    {isPending ? <Loader2 className="size-4 animate-spin" /> : <ImagePlus className="size-4" />}
                    Ajouter au dossier
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </CardAction>
        ) : null}
      </CardHeader>
      <CardContent>
        {photos.length > 0 ? (
          <MedicalPhotoGallery photos={photos} />
        ) : (
          <div className="flex flex-col items-center rounded-lg border border-dashed border-border p-8 text-center">
            <ImagePlus className="mb-3 size-6 text-muted-foreground/60" />
            <p className="text-sm font-medium">Aucune photographie</p>
            <p className="mt-1 text-xs text-muted-foreground">Les documents visuels ajoutés au dossier apparaîtront ici.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
