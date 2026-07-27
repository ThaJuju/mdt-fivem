const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 100;

export type PageParams = {
  page: number;
  pageSize: number;
  skip: number;
  take: number;
};

/** Lit `page`/`pageSize` depuis des searchParams d'URL, avec bornes raisonnables. */
export function parsePageParams(
  searchParams: Record<string, string | string[] | undefined>,
  defaultPageSize = DEFAULT_PAGE_SIZE,
): PageParams {
  const rawPage = Array.isArray(searchParams.page) ? searchParams.page[0] : searchParams.page;
  const rawPageSize = Array.isArray(searchParams.pageSize) ? searchParams.pageSize[0] : searchParams.pageSize;

  const page = Math.max(1, Number.parseInt(rawPage ?? "1", 10) || 1);
  const pageSize = Math.min(
    MAX_PAGE_SIZE,
    Math.max(1, Number.parseInt(rawPageSize ?? String(defaultPageSize), 10) || defaultPageSize),
  );

  return { page, pageSize, skip: (page - 1) * pageSize, take: pageSize };
}

export function pageCount(total: number, pageSize: number): number {
  return Math.max(1, Math.ceil(total / pageSize));
}
