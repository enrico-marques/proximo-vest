import type { DataTableColumnDef } from "@/components/data-table/use-data-table";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";

import React from "react";
import { DataTableColumnHeader } from "../../../../../../../../../components/data-table/data-table-column-header";
import { toast } from "sonner";
import { sectionSchema } from "./schema";
import Link from "next/link";

// cada linha da tabela é um item do array "items" do response
type Question = z.infer<typeof sectionSchema>["items"][number];

async function handleDelete(itemId: number) {
  try {
    const res = await fetch(`/api/question/${itemId}`, {
      method: "DELETE",
    });

    if (!res.ok) throw new Error("Erro ao deletar a questão");

    toast.success("Questão deletada com sucesso!");
    // Se quiser algo mais elegante depois pode trocar por mutate/SWR, etc.
    window.location.reload();
  } catch (err) {
    console.error(err);
    toast.error("Falha ao deletar a questão");
  }
}

export const getdashboardColumns = (
  slug: string,
  id: string,
  idPhase: string
): DataTableColumnDef<Question>[] => [
  // Número da questão com link
  {
    accessorKey: "numberLabel",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Questão" />
    ),
    cell: ({ row }) => {
      return (
        <a
          className="underline-offset-2 hover:underline"
          href={`/dashboard/admin/provas-questoes/${slug}/${id}/${idPhase}/${row.original.id}/preview`}
        >
          <Label>Q{row.original.numberLabel}</Label>
        </a>
      );
    },
    enableSorting: false,
  },

  // Tipo: objetiva/discursiva
  {
    accessorKey: "isDiscursive",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Tipo" />
    ),
    cell: ({ row }) => (
      <div className="w-32">
        <Badge variant="outline" className="text-muted-foreground px-1.5">
          {row.original.isDiscursive ? "Discursiva" : "Objetiva"}
        </Badge>
      </div>
    ),
    enableSorting: false,
  },

  // Dificuldade
  {
    accessorKey: "difficulty",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Dificuldade" />
    ),
    cell: ({ row }) => (
      <div className="w-32">
        <Label>{row.original.difficulty ?? "-"}</Label>
      </div>
    ),
    enableSorting: false,
  },

  // Status
  {
    accessorKey: "status",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Status" />
    ),
    cell: ({ row }) => (
      <div className="w-32">
        <Badge variant="secondary" className="px-1.5">
          {row.original.status}
        </Badge>
      </div>
    ),
    enableSorting: false,
  },

  // Criada em
  {
    accessorKey: "createdAt",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Criada em" />
    ),
    cell: ({ row }) => {
      const date = new Date(row.original.createdAt);
      const formatted = isNaN(date.getTime())
        ? "-"
        : date.toLocaleDateString("pt-BR", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
          });
      return (
        <div className="w-32">
          <Label>{formatted}</Label>
        </div>
      );
    },
    enableSorting: false,
  },

  // Ações
  {
    accessorKey: "actions",
    header: () => <div className="text-right pr-4">Ações</div>,
    cell: ({ row }) => {
  
      const [isDialogOpen, setIsDialogOpen] = React.useState(false);
      const [isEditOpen, setIsEditOpen] = React.useState(false);

      const item = row.original;

      return (
        <div className="flex justify-end items-center gap-2 pr-4">
          {/* Botão que abre o modal de edição */}
            <Link
          href={`/dashboard/admin/provas-questoes/${slug}/${id}/${idPhase}/${item.id}/edit`}
        >
          <Button
            variant="outline"
            size="sm"
       
          >
            Editar
          </Button>
 </Link>
       
     
          {/* Botão de deletar */}
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setIsDialogOpen(true)}
          >
            Deletar
          </Button>

          {/* Modal de confirmação de delete */}
          <AlertDialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  Tem certeza que deseja deletar esta questão?
                </AlertDialogTitle>
                <AlertDialogDescription>
                  Esta ação não pode ser desfeita. Isso irá deletar
                  permanentemente a questão e seus dados associados.
                </AlertDialogDescription>
              </AlertDialogHeader>

              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>

                <AlertDialogAction
                  className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
                  onClick={async () => {
                    await handleDelete(item.id);
                    setIsDialogOpen(false);
                  }}
                >
                  Deletar
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      );
    },
    enableSorting: false,
  },
];
