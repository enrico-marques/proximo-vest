"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { apiErrorMessage } from "@/lib/api-error";

const FormSchema = z.object({
  examBoardId: z.number(),
  year: z.number(),
  editionLabel: z.string().min(1, "O rótulo da edição é obrigatório"),
  notes: z.string().optional(),
});

export function FormCreateEdition({ boardId, slug }: { boardId: number; slug: string }) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      examBoardId: boardId,
      editionLabel: "",
      notes: "",
    },
    mode: "onSubmit",
  });

  const onSubmit = async (data: z.infer<typeof FormSchema>) => {
    setServerError(null);
    toast("Carregando...");
    try {
        data.year = Number(data.year);
      const res = await fetch(`/api/exam-edition/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          examBoardId: data.examBoardId,
          year: Number(data.year),
          editionLabel: data.editionLabel,
          notes: data.notes,
        }),
      });

      if (!res.ok) {
        // tenta obter a mensagem de erro do servidor
        const err = await res.json().catch(() => ({}));
        setServerError(apiErrorMessage(err, "Erro ao fazer login"));
        return;
      }
      router.push(`/dashboard/admin/provas-questoes/${slug}`);
    } catch (err) {
      console.error(err);
      setServerError("Erro inesperado. Tente novamente mais tarde.");
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="year"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Ano</FormLabel>
              <FormControl>
                <Input
                  id="year"
                  type="number"
                  placeholder="Ano da edição (Ex: 2024)"
                  autoComplete="off"
                  {...field}
                  onChange={(e) => field.onChange(e.target.value === "" ? undefined : e.target.valueAsNumber)}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="editionLabel"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Título da Edição</FormLabel>
              <FormControl>
                <Input
                  id="editionLabel"
                  type="text"
                  placeholder="Digite o título da edição"
                  autoComplete="off"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
                <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Observações</FormLabel>
              <FormControl>
                <Input
                  id="notes"
                  type="text"
                  placeholder="Observações adicionais"
                  autoComplete="off"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {serverError && toast.error(serverError)}
        <div className="flex justify-center">
          <Button className="w-full my-4" type="submit">
            Criar Edição
          </Button>
        </div>
      </form>
    </Form>
  );
}
