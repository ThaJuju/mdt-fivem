"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Pagination pour les listes qui n'utilisent pas `DataTable` (cartes, colonnes). */
export function SimplePagination({
  page,
  pageCount,
  total,
  noun = "résultat",
  invariable = false,
}: {
  page: number;
  pageCount: number;
  total: number;
  noun?: string;
  /** Pour les sigles comme « BOLO », qui ne prennent pas de s au pluriel. */
  invariable?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  if (total === 0) return null;

  function goToPage(nextPage: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(nextPage));
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex items-center justify-between text-sm text-muted-foreground">
      <span>
        {total} {noun}
        {total > 1 && !invariable ? "s" : ""} — page {page} sur {pageCount}
      </span>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => goToPage(page - 1)}>
          <ChevronLeft className="size-4" />
          Précédent
        </Button>
        <Button variant="outline" size="sm" disabled={page >= pageCount} onClick={() => goToPage(page + 1)}>
          Suivant
          <ChevronRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}
