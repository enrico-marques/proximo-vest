import type { DataTableColumnDef, DataTableRow } from "@/components/data-table/use-data-table";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
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
import { DataTableColumnHeader } from "../../../../../../../../components/data-table/data-table-column-header";
import { toast } from "sonner";
import { sectionSchema } from "./schema";

async function handleDelete(itemId: number) {
  try {
    const res = await fetch(`/api/exam-phase/${itemId}`, {
      method: "DELETE",
    });

    if (!res.ok) throw new Error("Erro ao deletar o item");

    toast.success("Item deletado com sucesso!");
    // Opcional: atualizar página ou tabela
    window.location.reload();
  } catch (err) {
    console.error(err);
    toast.error("Falha ao deletar o item");
  }
}

async function handleEdit(id: number, data: { name: string }) {
  try {
    const res = await fetch(`/api/exam-board/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
      headers: { "Content-Type": "application/json" },
    });
    if (!res.ok) {
      console.log(await res.text());
      throw new Error("Erro ao salvar edição");
    }
    toast.success("Item editado com sucesso!");
    window.location.reload();
  } catch (err) {
    console.error(err);
    toast.error("Erro ao salvar a edição");
  }
}

function RowActions({ row, id }: { row: DataTableRow<z.infer<typeof sectionSchema>>; id: string }) {
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [isEditOpen, setIsEditOpen] = React.useState(false);

  // dados atuais
  const item = row.original;

  return (
    <div className="flex justify-end items-center gap-2 pr-4">
      {/* Botão que abre o modal de edição */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsEditOpen(true)}
      >
        Editar
      </Button>

      {/* Modal de edição */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Edição: {item.phaseNumber}</DialogTitle>
            <DialogDescription>
              Faça alterações nos dados da edição e salve quando terminar.
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={async (e) => {
              e.preventDefault();

              const formData = new FormData(e.currentTarget);

              await handleEdit(item.id, {
                name: String(formData.get("name") ?? ""),
              });

              setIsEditOpen(false);
            }}
            className="space-y-4"
          >
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">Ano</label>
              <input
                name="name"
                defaultValue={item.phaseNumber}
                className="border rounded-md px-2 py-1"
                required
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700"
              >
                Salvar alterações
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

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
              Tem certeza que deseja deletar esta fase?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Isso irá deletar
              permanentemente a fase.
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
}

export const getdashboardColumns = (
  slug: string,
  id: string
): DataTableColumnDef<z.infer<typeof sectionSchema>>[] => [
  {
    accessorKey: "phaseNumber",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Fase" />
    ),
    cell: ({ row }) => {
      return (
        <a
          className="underline-offset-2 hover:underline"
          href={`/dashboard/admin/provas-questoes/${slug}/${id}/${row.original.id}`}
        >
          <Label>Fase: {row.original.phaseNumber}</Label>
        </a>
      );
    },
    enableSorting: false,
  },

  {
    accessorKey: "dayNumber ",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Dia" />
    ),
    cell: ({ row }) => {
      return (
        <Label htmlFor={`${row.original.id}-name`}>
          Dia: {row.original.dayNumber}
        </Label>
      );
    },
    enableSorting: false,
  },

  {
    accessorKey: "type",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Edição" />
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

  {
    accessorKey: "subjectBlock",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Edição" />
    ),
    cell: ({ row }) => (
      <div className="w-32">
        <Label>{row.original.subjectBlock}</Label>
      </div>
    ),
    enableSorting: false,
  },
  {
    accessorKey: "questionCountExpected",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Quantidade de questões" />
    ),
    cell: ({ row }) => (
      <div className="w-32">
        <Label>{row.original.questionCountExpected}</Label>
      </div>
    ),
    enableSorting: false,
  },
  {
    accessorKey: "actions",
    header: () => <div className="text-right pr-4">Ações</div>,
    cell: ({ row }) => <RowActions row={row} id={id} />,
    enableSorting: false,
  },
];
