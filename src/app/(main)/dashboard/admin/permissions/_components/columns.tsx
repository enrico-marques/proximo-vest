"use client";

import type { DataTableColumnDef } from "@/components/data-table/use-data-table";
import { EllipsisVertical } from "lucide-react";
import { z } from "zod";
import { useRouter } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { permissionsCreateSchema } from "./schema";

// tipo da linha: schema + id do banco
type RoleRow = z.infer<typeof permissionsCreateSchema> & {
  id: string;
};

export const dashboardColumns: DataTableColumnDef<RoleRow>[] = [
  {
    accessorKey: "name",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Nome" />
    ),
    cell: ({ row }) => (
      <div className="w-32">
        <Label htmlFor={row.original.id}>{row.original.key}</Label>
      </div>
    ),
    enableSorting: false,
  },
  {
    accessorKey: "isActive",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Status" />
    ),
    cell: ({ row }) => (
      <div className="w-32">
        <Badge variant="outline" className="text-muted-foreground px-1.5">
          {row.original.isActive ? "Ativa" : "Inativa"}
        </Badge>
      </div>
    ),
    enableSorting: false,
  },
 
];
