"use client";

import * as React from "react";

import { type DataTableColumnDef, useDataTable } from "@/components/data-table/use-data-table";

import { Plus } from "lucide-react";
import { z } from "zod";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { DataTable as DataTableNew } from "../../../../../../components/data-table/data-table";
import { DataTablePagination } from "../../../../../../components/data-table/data-table-pagination";
import { DataTableViewOptions } from "../../../../../../components/data-table/data-table-view-options";

import { dashboardColumns } from "./columns";
import { sectionSchema } from "./schema";

type Section = z.infer<typeof sectionSchema>;

export function DataTable({
  data
}: {
  data: Section[];
}) {
  const columns = React.useMemo<DataTableColumnDef<Section, unknown>[]>(
    () => dashboardColumns,
    []
  );

  const table = useDataTable({
    data,
    columns,
    getRowId: (row) => row.id.toString(),
  });

  return (
    <Tabs
      defaultValue="outline"
      className="w-full flex-col justify-start gap-6"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <DataTableViewOptions table={table} />
          <Button variant="outline" size="sm">
            <Plus />
            <a
              className="hidden lg:inline"
              href={`/dashboard/admin/provas-questoes//createEdition`}
            >
              Criar Edição
            </a>
          </Button>
        </div>
      </div>

      <TabsContent
        value="outline"
        className="relative flex flex-col gap-4 overflow-auto"
      >
        <div className="overflow-hidden rounded-lg border">
          <DataTableNew
            table={table}
            columns={columns}
          />
        </div>

        <DataTablePagination table={table} />
      </TabsContent>

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
