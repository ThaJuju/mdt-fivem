"use client";

import { SimplePagination } from "@/components/simple-pagination";

export function WarrantsPagination({
  page,
  pageCount,
  total,
}: {
  page: number;
  pageCount: number;
  total: number;
}) {
  return <SimplePagination page={page} pageCount={pageCount} total={total} noun="mandat" />;
}
