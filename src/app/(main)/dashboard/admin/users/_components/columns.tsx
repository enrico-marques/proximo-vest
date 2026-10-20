import Link from "next/link";
import type { DataTableColumnDef } from "@/components/data-table/use-data-table";
import { CircleCheck, Loader, EllipsisVertical } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { useRouter } from 'next/navigation'

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { DataTableColumnHeader } from "../../../../../../components/data-table/data-table-column-header";

import { sectionSchema } from "./schema";

export const dashboardColumns: DataTableColumnDef<z.infer<typeof sectionSchema>>[] = [
  {
    accessorKey: "name",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Nome" />
    ),
    cell: ({ row }) => (
      <Link
        className="font-medium underline-offset-2 hover:underline"
        href={`/dashboard/admin/users/${row.original.id}/edit`}
      >
        {row.original.name}
      </Link>
    ),
    enableSorting: false,
  },
  {
    accessorKey: "email",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Email" />
    ),
    cell: ({ row }) => {
      return (
        <Label htmlFor={`${row.original.email}-name`}>
          {row.original.email}
        </Label>
      );
    },
    enableSorting: false,
  },
  {
    accessorKey: "type",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Cargos" />
    ),
    cell: ({ row }) => (
      <div className="w-32">
        {row.original.roles.length > 0 ? (
          row.original.roles.map((role) => (
            <Badge
              key={role.roleId}
              variant="outline"
              className="text-muted-foreground px-1.5"
            >
              {role.role?.name ?? "Sem nome"}
            </Badge>
          ))
        ) : (
          <Badge variant="outline" className="text-muted-foreground px-1.5">
            Nenhum
          </Badge>
        )}
      </div>
    ),
    enableSorting: false,
  },
  {
    accessorKey: "status",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Status" />
    ),
    cell: ({ row }) => (
      <Badge
        variant="outline"
        className="text-muted-foreground flex items-center gap-1 px-1.5"
      >
        {row.original.status === "active" ? (
          <>
            <CircleCheck className="stroke-border fill-green-500 dark:fill-green-400" />
            Ativo
          </>
        ) : row.original.status === "suspended" ? (
          <>
            <Loader className="stroke-border fill-yellow-500 dark:fill-yellow-400 animate-spin" />
            Suspenso
          </>
        ) : (
          <>
            <Loader className="stroke-border fill-red-500 dark:fill-red-400" />
            Desativado
          </>
        )}
      </Badge>
    ),
    enableSorting: false,
  },

  {
    id: "actions",
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
        <DropdownMenuContent align="end" className="w-32">
            <DropdownMenuItem
              onClick={() =>
                router.push(`/dashboard/admin/users/${row.original.id}/edit`)
              }
            >
              Editar
            </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
     );
    },
    enableSorting: false,
  },
];
