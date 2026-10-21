import Link from "next/link";

import { Button } from "@/components/ui/button";

type QuestionPaginationProps = {
  basePath: string;
  page: number;
  pageCount: number;
  pageSize: number;
  total: number;
};

export function QuestionPagination({ basePath, page, pageCount, pageSize, total }: QuestionPaginationProps) {
  const href = (target: number) => `${basePath}?page=${target}&pageSize=${pageSize}`;
  const hasPrevious = page > 1;
  const hasNext = page < pageCount;

  return (
    <nav
      aria-label="Paginação das questões"
      className="flex flex-col gap-2 px-2 py-3 text-sm sm:flex-row sm:items-center sm:justify-between"
    >
      <span className="text-muted-foreground">
        Página <strong>{page}</strong> de <strong>{pageCount}</strong> · {total}{" "}
        {total === 1 ? "questão" : "questões"}
      </span>

      <div className="flex items-center gap-2">
        {hasPrevious ? (
          <Button variant="outline" size="sm" asChild>
            <Link href={href(page - 1)} rel="prev">
              Anterior
            </Link>
          </Button>
        ) : (
          <Button variant="outline" size="sm" disabled>
            Anterior
          </Button>
        )}
        {hasNext ? (
          <Button variant="outline" size="sm" asChild>
            <Link href={href(page + 1)} rel="next">
              Próxima
            </Link>
          </Button>
        ) : (
          <Button variant="outline" size="sm" disabled>
            Próxima
          </Button>
        )}
      </div>
    </nav>
  );
}
