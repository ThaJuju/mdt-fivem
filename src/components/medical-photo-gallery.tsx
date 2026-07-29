"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

export function MedicalPhotoGallery({ photos }: { photos: { id: string; url: string }[] }) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const active = activeIndex === null ? null : photos[activeIndex];

  function previous() {
    if (activeIndex === null) return;
    setActiveIndex((activeIndex - 1 + photos.length) % photos.length);
  }

  function next() {
    if (activeIndex === null) return;
    setActiveIndex((activeIndex + 1) % photos.length);
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {photos.map((photo, index) => (
          <button
            key={photo.id}
            type="button"
            onClick={() => setActiveIndex(index)}
            className="group relative aspect-square overflow-hidden rounded-lg border border-border bg-background text-left transition-all hover:-translate-y-0.5 hover:border-department/45 hover:shadow-[0_14px_35px_rgb(0_0_0/0.28)]"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photo.url}
              alt={`Photo médicale ${index + 1}`}
              className="size-full object-cover transition-transform duration-200 group-hover:scale-105"
            />
            <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent px-2 pt-6 pb-2 text-[0.6875rem] text-white">
              Photo {index + 1} · Agrandir
            </span>
          </button>
        ))}
      </div>

      <Dialog open={activeIndex !== null} onOpenChange={(open) => !open && setActiveIndex(null)}>
        <DialogContent
          showCloseButton={false}
          className="flex h-[94vh] w-[96vw] max-w-[96vw] items-center justify-center overflow-hidden border-border/80 bg-black/95 p-0 sm:max-w-[96vw]"
        >
          <DialogTitle className="sr-only">
            Photographie médicale {activeIndex === null ? "" : activeIndex + 1}
          </DialogTitle>

          {active ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={active.url}
                alt={`Photo médicale ${activeIndex! + 1}`}
                className="max-h-full max-w-full object-contain"
              />
              <div className="absolute inset-x-0 top-0 flex items-center justify-between bg-gradient-to-b from-black/75 to-transparent p-4">
                <span className="rounded-md bg-black/45 px-3 py-1.5 font-mono text-xs text-white">
                  {activeIndex! + 1} / {photos.length}
                </span>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  onClick={() => setActiveIndex(null)}
                  className="bg-black/40 text-white hover:bg-black/65 hover:text-white"
                  title="Fermer"
                >
                  <X className="size-5" />
                </Button>
              </div>

              {photos.length > 1 ? (
                <>
                  <Button
                    type="button"
                    size="icon-lg"
                    variant="ghost"
                    onClick={previous}
                    className="absolute left-3 bg-black/45 text-white hover:bg-black/70 hover:text-white"
                    title="Photo précédente"
                  >
                    <ChevronLeft className="size-6" />
                  </Button>
                  <Button
                    type="button"
                    size="icon-lg"
                    variant="ghost"
                    onClick={next}
                    className="absolute right-3 bg-black/45 text-white hover:bg-black/70 hover:text-white"
                    title="Photo suivante"
                  >
                    <ChevronRight className="size-6" />
                  </Button>
                </>
              ) : null}
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
