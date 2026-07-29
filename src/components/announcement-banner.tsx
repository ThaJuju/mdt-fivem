"use client";

import { useEffect, useState } from "react";
import { Megaphone, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export type BannerAnnouncement = {
  id: string;
  title: string;
  content: string;
  departmentShortName: string | null;
  authorName: string;
  /** Sert de version : modifier une annonce la fait réapparaître. */
  updatedAt: string;
};

const STORAGE_KEY = "mdt:annonces-lues";

/**
 * Bandeau d'annonces épinglées, affiché en haut de TOUTES les pages.
 *
 * Une annonce interne reléguée au tableau de bord se rate : un agent arrive
 * souvent directement sur un dossier ou le dispatch. Seules les annonces
 * épinglées remontent ici — les autres restent sur le tableau de bord, sinon
 * le bandeau deviendrait du bruit qu'on apprend à ignorer.
 *
 * Le rouge reste réservé aux alertes : ce bandeau utilise la couleur du
 * département, une annonce n'est pas une urgence.
 */
export function AnnouncementBanner({ announcements }: { announcements: BannerAnnouncement[] }) {
  const [dismissed, setDismissed] = useState<string[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      setDismissed(raw ? (JSON.parse(raw) as string[]) : []);
    } catch {
      setDismissed([]);
    }
    setReady(true);
  }, []);

  function dismiss(key: string) {
    const next = [...dismissed, key];
    setDismissed(next);
    try {
      // On ne garde que les 50 dernières : la liste ne doit pas enfler sans fin.
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next.slice(-50)));
    } catch {
      /* stockage indisponible : l'annonce réapparaîtra, ce n'est pas grave */
    }
  }

  // Avant lecture du stockage, on n'affiche rien : éviter que le bandeau
  // clignote puis disparaisse pour une annonce déjà écartée.
  if (!ready) return null;

  const visible = announcements.filter((a) => !dismissed.includes(`${a.id}:${a.updatedAt}`));
  if (visible.length === 0) return null;

  return (
    <div className="flex flex-col">
      {visible.map((announcement) => (
        <div
          key={announcement.id}
          className="flex items-start gap-3 border-b border-department/40 bg-department/10 px-4 py-2.5"
        >
          <Megaphone className="mt-0.5 size-4 shrink-0 text-department" />
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium text-department">{announcement.title}</span>
              <span className="font-mono text-xs text-muted-foreground">
                {announcement.departmentShortName ?? "Tous services"}
              </span>
            </div>
            <p className="text-sm whitespace-pre-wrap text-foreground">{announcement.content}</p>
            <span className="text-xs text-muted-foreground">{announcement.authorName}</span>
          </div>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="size-7 shrink-0"
            onClick={() => dismiss(`${announcement.id}:${announcement.updatedAt}`)}
            title="Masquer cette annonce"
          >
            <X className="size-4" />
          </Button>
        </div>
      ))}
    </div>
  );
}
