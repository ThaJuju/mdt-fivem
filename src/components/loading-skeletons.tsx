import { Skeleton } from "@/components/ui/skeleton";

/** Squelette de liste : barre d'outils puis lignes de tableau. */
export function ListSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-4" aria-busy="true" aria-live="polite">
      <span className="sr-only">Chargement en cours…</span>
      <div className="flex items-center justify-between gap-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-8 w-40" />
      </div>
      <div className="flex flex-col gap-px overflow-hidden rounded-md border border-border">
        <Skeleton className="h-10 w-full rounded-none" />
        {Array.from({ length: rows }).map((_, index) => (
          <Skeleton key={index} className="h-12 w-full rounded-none opacity-60" />
        ))}
      </div>
    </div>
  );
}

/** Squelette de fiche : titre puis deux colonnes de cartes. */
export function DetailSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true" aria-live="polite">
      <span className="sr-only">Chargement en cours…</span>
      <Skeleton className="h-9 w-80" />
      <div className="grid gap-6 lg:grid-cols-2">
        <Skeleton className="h-72 w-full" />
        <Skeleton className="h-72 w-full" />
      </div>
      <Skeleton className="h-40 w-full" />
    </div>
  );
}
