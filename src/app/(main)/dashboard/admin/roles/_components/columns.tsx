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
import { DataTableColumnHeader } from "../../../../../../components/data-table/data-table-column-header";
import { roleCreateSchema } from "./schema";

// tipo da linha: schema + id do banco
type RoleRow = z.infer<typeof roleCreateSchema> & {
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
        <Label htmlFor={row.original.id}>{row.original.name}</Label>
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
  {
    id: "actions",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Ações" />
    ),
    cell: ({ row }) => {
      const router = useRouter(); // hook tem que ficar aqui dentro

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="data-[state=open]:bg-muted text-muted-foreground flex size-8"
              size="icon"
            >
              <EllipsisVertical />
              <span className="sr-only">Open menu</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            {/* Exemplo de ações */}
            <DropdownMenuItem
              onClick={() =>
                router.push(`/dashboard/admin/roles/${row.original.id}/permissions`)
              }
            >
              Editar permissões
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            <DropdownMenuItem className="text-destructive focus:text-destructive">
              Deletar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
    enableSorting: false,
  },
];
