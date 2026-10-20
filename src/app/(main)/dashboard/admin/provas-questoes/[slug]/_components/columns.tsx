import { z } from "zod";
import type { DataTableColumnDef, DataTableRow } from "@/components/data-table/use-data-table";
import { EllipsisVertical } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import React from "react";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { DataTableColumnHeader } from "../../../../../../../components/data-table/data-table-column-header";

import { sectionSchema } from "./schema";

type Section = z.infer<typeof sectionSchema>;

async function handleDelete(itemId: number) {
  try {
    const res = await fetch(`/api/exam-edition/${itemId}`, {
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

async function handleEdit(
  id: number,
  data: { editionLabel: string; notes?: string | null }
) {
  try {
    const res = await fetch(`/api/exam-edition/${id}`, {
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

function RowActions({ row }: { row: DataTableRow<Section> }) {
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
            <DialogTitle>Editar Edição: {item.year}</DialogTitle>
            <DialogDescription>
              Faça alterações nos dados da edição e salve quando terminar.
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={async (e) => {
              e.preventDefault();

              const formData = new FormData(e.currentTarget);

              await handleEdit(item.id, {
                editionLabel: String(formData.get("editionLabel") || ""),
                notes: formData.get("notes")?.toString() || null,
              });

              setIsEditOpen(false);
            }}
            className="space-y-4"
          >
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">Ano</label>
              <input
                name="year"
                defaultValue={item.year}
                className="border rounded-md px-2 py-1"
                disabled
              />
              <label className="text-sm font-medium">Título</label>
              <input
                name="editionLabel"
                defaultValue={item.editionLabel}
                className="border rounded-md px-2 py-1"
                required
              />
              <label className="text-sm font-medium">Observações</label>
              <input
                name="notes"
                defaultValue={item.notes || ""}
                className="border rounded-md px-2 py-1"
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
              Tem certeza que deseja deletar esta edição?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Isso irá deletar
              permanentemente a edição.
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

export function getDashboardColumns(slug: string): DataTableColumnDef<Section>[] {
  return [
    {
      accessorKey: "year",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Nome da Prova" />
      ),
      cell: ({ row }) => {
        return (
          <a
            className="underline-offset-2 hover:underline"
            href={`/dashboard/admin/provas-questoes/${slug}/${row.original.id}`}
          >
            <Label htmlFor={`${row.original.year}-name`}>
              {row.original.year}
            </Label>
          </a>
        );
      },
      enableSorting: false,
    },
    {
      accessorKey: "editionLabel",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Edição" />
      ),
      cell: ({ row }) => (
        <div className="w-32">
          <Badge variant="outline" className="text-muted-foreground px-1.5">
            {row.original.editionLabel}
          </Badge>
        </div>
      ),
      enableSorting: false,
    },

    {
      accessorKey: "actions",
      header: () => <div className="text-right pr-4">Ações</div>,
      cell: ({ row }) => <RowActions row={row} />,
      enableSorting: false,
    },
  ];
}
