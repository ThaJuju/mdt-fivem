"use client";

import { useEffect, useRef, useState, type ClipboardEvent, type DragEvent } from "react";
import { ImagePlus, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Champ multi-images : coller (Ctrl+V), déposer ou choisir plusieurs photos.
 *
 * Chaque image part vers `/api/upload` dès qu'elle est ajoutée, bien avant
 * l'enregistrement du formulaire. Les URL obtenues sont ensuite soumises via
 * des inputs cachés partageant le même `name` : la server action les relit
 * avec `formData.getAll(name)`.
 *
 * C'est ce qui permet de joindre des photos à un rapport *pendant* sa
 * rédaction, alors que les pièces jointes ont besoin d'un rapport existant
 * pour être rattachées en base.
 */
export function MultiImageField({
  name,
  value,
  onChange,
}: {
  name: string;
  /** Optionnel : rend le champ contrôlé, pour restaurer un brouillon. */
  value?: string[];
  onChange?: (urls: string[]) => void;
}) {
  const [internal, setInternal] = useState<string[]>([]);
  const urls = value ?? internal;
  const setUrls = (update: (previous: string[]) => string[]) => {
    const next = update(urls);
    if (onChange) onChange(next);
    else setInternal(next);
  };
  const [pending, setPending] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const zoneRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function uploadAll(files: File[]) {
    const images = files.filter((file) => file.type.startsWith("image/"));
    if (images.length === 0) return;

    setError(null);
    setPending((count) => count + images.length);

    for (const file of images) {
      try {
        const body = new FormData();
        body.append("file", file);
        const response = await fetch("/api/upload", { method: "POST", body });
        const payload: unknown = await response.json().catch(() => null);

        if (!response.ok) {
          setError(
            payload && typeof payload === "object" && "error" in payload
              ? String((payload as { error: unknown }).error)
              : "L'envoi a échoué. Réessayez.",
          );
        } else if (payload && typeof payload === "object" && "url" in payload) {
          const url = String((payload as { url: unknown }).url);
          setUrls((previous) => [...previous, url]);
        }
      } catch {
        setError("Envoi impossible : vérifiez votre connexion au serveur.");
      } finally {
        setPending((count) => count - 1);
      }
    }
  }

  function handlePaste(event: ClipboardEvent) {
    const files = Array.from(event.clipboardData?.files ?? []);
    if (files.some((file) => file.type.startsWith("image/"))) {
      event.preventDefault();
      void uploadAll(files);
    }
  }

  // L'écouteur de collage est posé une seule fois ; cette référence lui donne
  // accès à la dernière version d'`uploadAll` sans le réabonner à chaque rendu.
  const uploadAllRef = useRef(uploadAll);
  uploadAllRef.current = uploadAll;

  // Collage global : on colle après une capture, sans cliquer dans la zone.
  useEffect(() => {
    function onDocumentPaste(event: globalThis.ClipboardEvent) {
      const zone = zoneRef.current;
      if (!zone) return;
      const active = document.activeElement;
      // Si le focus est dans un champ de saisie, on laisse le texte se coller.
      if (active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement) return;

      const files = Array.from(event.clipboardData?.files ?? []);
      if (!files.some((file) => file.type.startsWith("image/"))) return;
      event.preventDefault();
      void uploadAllRef.current(files);
    }

    document.addEventListener("paste", onDocumentPaste);
    return () => document.removeEventListener("paste", onDocumentPaste);
  }, []);

  function handleDrop(event: DragEvent) {
    event.preventDefault();
    setIsDragging(false);
    void uploadAll(Array.from(event.dataTransfer?.files ?? []));
  }

  return (
    <div className="flex flex-col gap-2">
      {urls.map((url) => (
        <input key={url} type="hidden" name={name} value={url} />
      ))}

      <div
        ref={zoneRef}
        tabIndex={0}
        role="button"
        aria-label="Photos — coller, déposer ou choisir des images"
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
          "flex min-h-28 cursor-pointer flex-col items-center justify-center gap-2 rounded-md border border-dashed p-4 text-center transition-colors",
          isDragging ? "border-department bg-department/5" : "border-border hover:border-muted-foreground/50",
        )}
      >
        {pending > 0 ? (
          <>
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              Envoi de {pending} image{pending > 1 ? "s" : ""}…
            </span>
          </>
        ) : (
          <>
            <ImagePlus className="size-5 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              Collez vos photos (Ctrl+V), déposez-les ici, ou cliquez pour les choisir
            </span>
            <span className="text-xs text-muted-foreground">
              PNG, JPEG, GIF ou WebP — 5 Mo par image
            </span>
          </>
        )}

        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/png,image/jpeg,image/gif,image/webp"
          className="sr-only"
          onChange={(event) => {
            void uploadAll(Array.from(event.target.files ?? []));
            event.target.value = "";
          }}
        />
      </div>

      {urls.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {urls.map((url, index) => (
            <div key={url} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url}
                alt={`Photo ${index + 1}`}
                className="size-24 rounded-md border border-border object-cover"
              />
              <Button
                type="button"
                size="icon"
                variant="ghost"
                onClick={() => setUrls((previous) => previous.filter((item) => item !== url))}
                className="absolute top-0.5 right-0.5 size-6 bg-card/80"
                title="Retirer cette photo"
              >
                <X className="size-3.5" />
              </Button>
            </div>
          ))}
        </div>
      ) : null}

      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
