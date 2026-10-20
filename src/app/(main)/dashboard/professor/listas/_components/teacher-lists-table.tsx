// src/app/(main)/dashboard/professor/listas/_components/teacher-lists-table.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { MoreHorizontal, Plus } from "lucide-react";
import { readApiError } from "@/lib/api-error";

type TeacherListDTO = {
  id: string;
  name: string;
  description?: string | null;
  teacherName: string;
  createdAt: string;
  updatedAt: string;
  questionsCount: number;
};

export function TeacherListsTable() {
  const router = useRouter();
  const [lists, setLists] = useState<TeacherListDTO[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  async function fetchLists() {
    try {
      setIsRefreshing(true);
      const res = await fetch("/api/teacher-lists");
      if (!res.ok) throw new Error("Erro ao carregar listas");
      const data = (await res.json()) as TeacherListDTO[];
      setLists(data);
    } catch (err) {
      console.error(err);
      toast.error("Não foi possível carregar as listas.");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }

  useEffect(() => {
    fetchLists();
  }, []);

  async function handleDuplicate(id: string) {
    try {
      const res = await fetch(`/api/teacher-lists/${id}/duplicate`, {
        method: "POST",
      });

      if (!res.ok) {
        throw new Error(await readApiError(res, "Erro ao duplicar lista."));
      }

      toast.success("Lista duplicada com sucesso.");
      await fetchLists();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Erro ao duplicar lista.");
    }
  }

  async function handleDelete(id: string) {
    try {
      const res = await fetch(`/api/teacher-lists/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        throw new Error(await readApiError(res, "Erro ao excluir lista."));
      }

      toast.success("Lista excluída.");
      setLists((prev) => prev.filter((l) => l.id !== id));
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Erro ao excluir lista.");
    }
  }

  function formatDate(dateStr: string) {
    const d = new Date(dateStr);
    try {
      return format(d, "dd/MM/yyyy", { locale: ptBR });
    } catch {
      return d.toLocaleDateString("pt-BR");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <Button
          asChild
          className="gap-2"
        >
          <Link href="/dashboard/professor/listas/nova">
            <Plus className="h-4 w-4" />
            Nova lista
          </Link>
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={fetchLists}
          disabled={isRefreshing}
        >
          {isRefreshing ? "Atualizando..." : "Atualizar"}
        </Button>
      </div>

      {isLoading ? (
        <div className="rounded-md border bg-muted/50 p-6 text-sm text-muted-foreground">
          Carregando listas de professor...
        </div>
      ) : lists.length === 0 ? (
        <div className="rounded-md border bg-muted/50 p-6 text-sm text-muted-foreground">
          Você ainda não criou nenhuma lista.
          <br />
          Clique em <strong>“Nova lista”</strong> para montar sua primeira folha de exercícios.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome da lista</TableHead>
                <TableHead>Professor(a)</TableHead>
                <TableHead className="w-[120px]">Questões</TableHead>
                <TableHead className="w-[120px]">Criada em</TableHead>
                <TableHead className="w-20" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {lists.map((list) => (
                <TableRow key={list.id}>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium">{list.name}</span>
                      {list.description && (
                        <span className="text-xs text-muted-foreground line-clamp-1">
                          {list.description}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">
                    {list.teacherName}
                  </TableCell>
                  <TableCell className="text-sm">
                    {list.questionsCount}
                  </TableCell>
                  <TableCell className="text-sm">
                    {formatDate(list.createdAt)}
                  </TableCell>
                  <TableCell className="text-right">
                    <RowActions
                      listId={list.id}
                      onDuplicate={handleDuplicate}
                      onDelete={handleDelete}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

type RowActionsProps = {
  listId: string;
  onDuplicate: (id: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
};

function RowActions({ listId, onDuplicate, onDelete }: RowActionsProps) {
  return (
    <AlertDialog>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Ações</DropdownMenuLabel>

          <DropdownMenuItem asChild>
            <Link href={`/dashboard/professor/listas/${listId}`}>
              Editar lista
            </Link>
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={(e) => {
              e.preventDefault();
              void onDuplicate(listId);
            }}
          >
            Duplicar
          </DropdownMenuItem>

          {/* Botões de PDF – vão funcionar quando criarmos a rota de PDF */}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            asChild
          >
            <a
              href={`/api/teacher-lists/${listId}/pdf`}
              target="_blank"
              rel="noopener noreferrer"
            >
              PDF sem gabarito
            </a>
          </DropdownMenuItem>
          <DropdownMenuItem
            asChild
          >
            <a
              href={`/api/teacher-lists/${listId}/pdf?withAnswers=1`}
              target="_blank"
              rel="noopener noreferrer"
            >
              PDF com gabarito
            </a>
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <AlertDialogTrigger asChild>
            <DropdownMenuItem className="text-destructive">
              Excluir
            </DropdownMenuItem>
          </AlertDialogTrigger>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir lista?</AlertDialogTitle>
          <AlertDialogDescription>
            Essa ação não pode ser desfeita. A lista será removida
            permanentemente, mas as questões continuam no banco normalmente.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onClick={(e) => {
              e.preventDefault();
              void onDelete(listId);
            }}
          >
            Excluir
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
