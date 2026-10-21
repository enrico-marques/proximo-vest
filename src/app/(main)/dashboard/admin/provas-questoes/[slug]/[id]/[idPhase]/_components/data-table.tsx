"use client";

import * as React from "react";

import { flexRender } from "@tanstack/react-table";
import { type DataTableColumnDef, useDataTable } from "@/components/data-table/use-data-table";

import { Plus } from "lucide-react";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { getdashboardColumns } from "./columns";
import { sectionSchema } from "./schema";

// cada linha da tabela é um item do array `items` do response
type Question = z.infer<typeof sectionSchema>["items"][number];

type DataTableProps = {
  data: Question[]; // você provavelmente já está passando response.items aqui
  slug: string;
  id: string;
  idPhase: string;
};

export function DataTable({ data, slug, id, idPhase }: DataTableProps) {
const columns = React.useMemo<DataTableColumnDef<Question, unknown>[]>(
  () => getdashboardColumns(slug, id, idPhase),
  [slug, id, idPhase]
);

  const table = useDataTable({
    data,
    columns,
    getRowId: (row) => row.id.toString(),
    // The page passes one server-side page; QuestionPagination moves between pages.
    manualPagination: true,
  });

  return (
    <Tabs
      defaultValue="outline"
      className="w-full flex-col justify-start gap-6"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <a
              href={`/dashboard/admin/provas-questoes/${slug}/${id}/${idPhase}/createQuestion`}
            >
              <Plus className="mr-1 h-4 w-4" />
              <span className="hidden lg:inline">Criar Questões</span>
            </a>
          </Button>
        </div>
      </div>

      <TabsContent
        value="outline"
        className="relative flex flex-col gap-4 overflow-auto"
      >
        <div className="overflow-hidden rounded-lg border">
          <Table>
            <TableHeader className="bg-muted sticky top-0 z-10">
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id} colSpan={header.colSpan}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>

            <TableBody>
              {table.getRowModel().rows.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="h-24 text-center"
                  >
                    Sem registros
                  </TableCell>
                </TableRow>
              ) : (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() && "selected"}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

      </TabsContent>

      {/* Outras tabs placeholder */}
      <TabsContent value="past-performance" className="flex flex-col">
        <div className="aspect-video w-full flex-1 rounded-lg border border-dashed" />
      </TabsContent>
      <TabsContent value="key-personnel" className="flex flex-col">
        <div className="aspect-video w-full flex-1 rounded-lg border border-dashed" />
      </TabsContent>
      <TabsContent value="focus-documents" className="flex flex-col">
        <div className="aspect-video w-full flex-1 rounded-lg border border-dashed" />
      </TabsContent>
    </Tabs>
  );
}
