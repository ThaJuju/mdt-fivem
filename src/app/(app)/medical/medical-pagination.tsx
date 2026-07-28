"use client";

import { SimplePagination } from "@/components/simple-pagination";

export function MedicalPagination({
  page,
  pageCount,
  total,
}: {
  page: number;
  pageCount: number;
  total: number;
}) {
  return <SimplePagination page={page} pageCount={pageCount} total={total} noun="patient" />;
}
