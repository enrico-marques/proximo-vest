"use client";

import {
  columnVisibilityFeature,
  createPaginatedRowModel,
  createSortedRowModel,
  rowPaginationFeature,
  rowSelectionFeature,
  rowSortingFeature,
  sortFn_alphanumeric,
  sortFn_basic,
  sortFn_datetime,
  sortFn_text,
  tableFeatures,
  useTable,
  type ColumnDef,
  type Column,
  type Row,
  type RowData,
} from "@tanstack/react-table";

// Every admin table shares this feature set. Register only what the tables use: v9 exposes
// an API only when its feature is listed here, and "auto" sorting only picks registered sortFns.
export const dataTableFeatures = tableFeatures({
  rowSortingFeature,
  columnVisibilityFeature,
  rowSelectionFeature,
  rowPaginationFeature,
  sortedRowModel: createSortedRowModel(),
  paginatedRowModel: createPaginatedRowModel(),
  sortFns: {
    alphanumeric: sortFn_alphanumeric,
    basic: sortFn_basic,
    datetime: sortFn_datetime,
    text: sortFn_text,
  },
});

export type DataTableFeatures = typeof dataTableFeatures;

export type DataTableColumnDef<TData extends RowData, TValue = unknown> = ColumnDef<
  DataTableFeatures,
  TData,
  TValue
>;
export type DataTableColumn<TData extends RowData, TValue = unknown> = Column<
  DataTableFeatures,
  TData,
  TValue
>;
export type DataTableRow<TData extends RowData> = Row<DataTableFeatures, TData>;

export const DEFAULT_PAGE_SIZE = 10;

export function useDataTable<TData extends RowData>({
  data,
  columns,
  getRowId,
  manualPagination = false,
}: {
  data: TData[];
  columns: DataTableColumnDef<TData>[];
  getRowId?: (row: TData, index: number) => string;
  /** The server already sent a single page: render every row it got. */
  manualPagination?: boolean;
}) {
  return useTable({
    features: dataTableFeatures,
    data,
    columns,
    getRowId,
    manualPagination,
    initialState: { pagination: { pageIndex: 0, pageSize: DEFAULT_PAGE_SIZE } },
  });
}

export type DataTableInstance<TData extends RowData> = ReturnType<typeof useDataTable<TData>>;
