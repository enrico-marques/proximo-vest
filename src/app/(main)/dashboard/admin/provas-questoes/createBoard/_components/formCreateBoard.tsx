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
  name: z.string().min(3, { message: "Name must be at least 3 characters." }),
  slug: z.string(),
});

export function FormCreateBoard() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      name: "",
      slug: "",
    },
    mode: "onSubmit",
  });

  useEffect(() => {
    const name = form.watch("name");
    if (name) {
      const slug = name
        .toLowerCase()
        .normalize("NFD") // remove acentos
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\s+/g, "-") // troca espaços por hífen
        .replace(/[^a-z0-9-]/g, ""); // remove caracteres especiais
      form.setValue("slug", slug);
    } else {
      form.setValue("slug", "");
    }
  }, [form.watch("name")]);

  const onSubmit = async (data: z.infer<typeof FormSchema>) => {
    setServerError(null);
 
    try {
      const res = await fetch(`/api/exam-board/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.name,
          slug: data.slug,
        }),
      });

      if (!res.ok) {
        // tenta obter a mensagem de erro do servidor
        const err = await res.json().catch(() => ({}));
        setServerError(apiErrorMessage(err, "Erro ao fazer login"));
        return;
      }
    toast.success("Prova criada com sucesso!");
      router.push("/dashboard/admin/provas-questoes");
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
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome da Prova</FormLabel>
              <FormControl>
                <Input
                  id="name"
                  type="text"
                  placeholder="Digite o nome da prova"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="slug"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Slug (Preenchido automaticamente)</FormLabel>
              <FormControl>
                <Input
                  id="slug"
                  type="text"
                  placeholder="slug-da-prova"
                  autoComplete="name"
                  {...field}
                  disabled
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {serverError && toast.error(serverError)}
        <div className="flex justify-center">
          <Button className="w-full my-4" type="submit">
            Criar Prova
          </Button>
        </div>
      </form>
    </Form>
  );
}
