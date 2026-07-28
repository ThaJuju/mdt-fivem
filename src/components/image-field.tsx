"use client";

import { useEffect, useRef, useState, type ClipboardEvent, type DragEvent } from "react";
import { ImagePlus, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Champ image : coller (Ctrl+V), déposer ou choisir un fichier.
 *
 * La valeur soumise avec le formulaire reste l'URL du fichier envoyé, via un
 * input caché — les server actions continuent donc de recevoir une simple
 * chaîne, sans rien changer côté validation.
 *
 * Le collage est écouté sur la zone *et* sur le document : c'est le vrai
 * réflexe d'un agent qui fait une capture puis Ctrl+V sans penser à cliquer
 * dans le champ d'abord. L'écoute globale ne s'active que si aucun autre
 * champ image n'a le focus, pour éviter que deux champs se disputent la même
 * image sur un formulaire qui en contiendrait plusieurs.
 */
export function ImageField({
  name,
  defaultValue,
  label = "Image",
}: {
  name: string;
  defaultValue?: string | null;
  label?: string;
}) {
  const [url, setUrl] = useState<string>(defaultValue ?? "");
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const zoneRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function upload(file: File) {
    setError(null);
    setIsUploading(true);
    try {
      const body = new FormData();
      body.append("file", file);
      const response = await fetch("/api/upload", { method: "POST", body });
      const payload: unknown = await response.json().catch(() => null);

      if (!response.ok) {
        const message =
          payload && typeof payload === "object" && "error" in payload
            ? String((payload as { error: unknown }).error)
            : "L'envoi a échoué. Réessayez.";
        setError(message);
        return;
      }
      if (payload && typeof payload === "object" && "url" in payload) {
        setUrl(String((payload as { url: unknown }).url));
      }
    } catch {
      setError("Envoi impossible : vérifiez votre connexion au serveur.");
    } finally {
      setIsUploading(false);
    }
  }

  /** Extrait la première image d'un presse-papiers ou d'un glisser-déposer. */
  function firstImage(items: FileList | null | undefined): File | null {
    if (!items) return null;
    for (const file of Array.from(items)) {
      if (file.type.startsWith("image/")) return file;
    }
    return null;
  }

  function handlePaste(event: ClipboardEvent) {
    const file = firstImage(event.clipboardData?.files);
    if (!file) return;
    event.preventDefault();
    void upload(file);
  }

  // Collage global : l'agent copie une capture puis fait Ctrl+V n'importe où.
  useEffect(() => {
    function onDocumentPaste(event: globalThis.ClipboardEvent) {
      const zone = zoneRef.current;
      if (!zone) return;
      // Si un autre champ image est actif, on le laisse traiter le collage.
      const active = document.activeElement;
      if (active && active !== document.body && !zone.contains(active)) {
        const otherField = active.closest("[data-image-field]");
        if (otherField && otherField !== zone) return;
      }
      // Un seul champ répond au collage global : le premier de la page.
      const fields = Array.from(document.querySelectorAll("[data-image-field]"));
      const isFocusedHere = active ? zone.contains(active) : false;
      if (!isFocusedHere && fields[0] !== zone) return;

      const file = firstImage(event.clipboardData?.files);
      if (!file) return;
      event.preventDefault();
      void upload(file);
    }

    document.addEventListener("paste", onDocumentPaste);
    return () => document.removeEventListener("paste", onDocumentPaste);
  }, []);

  function handleDrop(event: DragEvent) {
    event.preventDefault();
    setIsDragging(false);
    const file = firstImage(event.dataTransfer?.files);
    if (file) void upload(file);
  }

  return (
    <div className="flex flex-col gap-2">
      <input type="hidden" name={name} value={url} />

      <div
        ref={zoneRef}
        data-image-field
        tabIndex={0}
        role="button"
        aria-label={`${label} — coller, déposer ou choisir une image`}
        onPaste={handlePaste}
        onDrop={handleDrop}
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            inputRef.current?.click();
          }
        }}
        className={cn(
          "relative flex min-h-32 cursor-pointer flex-col items-center justify-center gap-2 rounded-md border border-dashed p-4 text-center transition-colors",
          isDragging ? "border-department bg-department/5" : "border-border hover:border-muted-foreground/50",
        )}
      >
        {url ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt={label} className="max-h-40 rounded object-contain" />
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={(event) => {
                event.stopPropagation();
                setUrl("");
                setError(null);
              }}
              className="absolute top-1 right-1"
              title="Retirer l'image"
            >
              <X className="size-4" />
            </Button>
          </>
        ) : isUploading ? (
          <>
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Envoi en cours…</span>
          </>
        ) : (
          <>
            <ImagePlus className="size-5 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              Collez une image (Ctrl+V), déposez-la ici, ou cliquez pour la choisir
            </span>
            <span className="text-xs text-muted-foreground">PNG, JPEG, GIF ou WebP — 5 Mo maximum</span>
          </>
        )}

        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/gif,image/webp"
          className="sr-only"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void upload(file);
            event.target.value = "";
          }}
        />
      </div>

      {isUploading && url ? (
        <span className="text-xs text-muted-foreground">Envoi en cours…</span>
      ) : null}
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
