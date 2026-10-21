"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { apiErrorMessage } from "@/lib/api-error";

const FormSchema = z.object({
  examEditionId: z.number(),
  phaseNumber: z.number({}),
  dayNumber: z.number().nullable(),
  subjectBlock: z.string().nullable(),
  questionCountExpected: z.number().nullable(),
  defaultOptionCount: z.number().nullable(),
  isDiscursive: z.boolean(),
});

export function FormCreateEdition({
  id,
  slug,
}: {
  id: number;
  slug: string;
}) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      examEditionId: id,
      dayNumber: null,
      subjectBlock: null,
      questionCountExpected: null,
      defaultOptionCount: null,
      isDiscursive: undefined,
    },
    mode: "onSubmit",
  });

  const onSubmit = async (data: z.infer<typeof FormSchema>) => {
    setIsSubmitting(true);
    toast("Carregando...");

    try {
      const res = await fetch(`/api/exam-phase/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        console.error(err);
        toast.error(apiErrorMessage(err, "Erro ao criar fase"));
        return;
      }

      toast.success("Fase criada com sucesso!");
      router.push(`/dashboard/admin/provas-questoes/${slug}/${id}`);
    } catch (err) {
      console.error(err);
      toast.error("Erro inesperado. Tente novamente mais tarde.");
    } finally {
      setIsSubmitting(false);
    }
  };
  const isDiscursive = form.watch("isDiscursive");

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {/* Fase */}
        <FormField
          control={form.control}
          name="phaseNumber"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Fase</FormLabel>
              <FormControl>
                <Input
                  id="phaseNumber"
                  type="number"
                  placeholder="Número da fase (Ex: 1)"
                  autoComplete="off"
                  {...field}
                  value={field.value ?? ""}
                  onChange={(e) =>
                    field.onChange(
                      e.target.value === "" ? undefined : e.target.valueAsNumber
                    )
                  }
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Dia */}
        <FormField
          control={form.control}
          name="dayNumber"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Dia</FormLabel>
              <FormControl>
                <Input
                  id="dayNumber"
                  type="number"
                  placeholder="Dia da fase (Ex: 1, 2)"
                  autoComplete="off"
                  {...field}
                  value={field.value ?? ""}
                  onChange={(e) =>
                    field.onChange(
                      e.target.value === "" ? null : e.target.valueAsNumber
                    )
                  }
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Bloco de disciplinas */}
        <FormField
          control={form.control}
          name="subjectBlock"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Bloco de disciplinas</FormLabel>
              <FormControl>
                <Input
                  id="subjectBlock"
                  type="text"
                  placeholder="Ex: Linguagens, Humanas, Exatas..."
                  autoComplete="off"
                  {...field}
                  value={field.value ?? ""}
                  onChange={(e) =>
                    field.onChange(
                      e.target.value === "" ? null : e.target.value
                    )
                  }
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Quantidade esperada de questões */}
        <FormField
          control={form.control}
          name="questionCountExpected"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Quantidade de questões (esperado)</FormLabel>
              <FormControl>
                <Input
                  id="questionCountExpected"
                  type="number"
                  placeholder="Ex: 90"
                  autoComplete="off"
                  {...field}
                  value={field.value ?? ""}
                  onChange={(e) =>
                    field.onChange(
                      e.target.value === "" ? null : e.target.valueAsNumber
                    )
                  }
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {/* Tipo de questão: Objetiva ou Discursiva */}
        <FormField
          control={form.control}
          name="isDiscursive"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tipo de prova</FormLabel>
              <FormDescription>
                Escolha se esta fase é objetiva ou discursiva.
              </FormDescription>

              <Select
                onValueChange={(value) => field.onChange(value === "true")}
                value={
                  field.value === undefined || field.value === null
                    ? undefined
                    : field.value
                      ? "true"
                      : "false"
                }
              >
                <FormControl>
                  <SelectTrigger id="isDiscursive">
                    <SelectValue placeholder="Selecione o tipo da fase" />
                  </SelectTrigger>
                </FormControl>

                <SelectContent>
                  <SelectItem value="false">Objetiva</SelectItem>
                  <SelectItem value="true">Discursiva</SelectItem>
                </SelectContent>
              </Select>

              <FormMessage />
            </FormItem>
          )}
        />

        {/* Quantidade padrão de alternativas - só aparece se isDiscursive === false */}
        {isDiscursive === false && (
          <FormField
            control={form.control}
            name="defaultOptionCount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Quantidade padrão de alternativas</FormLabel>
                <FormControl>
                  <Select
                    onValueChange={(value) =>
                      field.onChange(value === "" ? null : Number(value))
                    }
                    value={field.value?.toString() ?? ""}
                  >
                    <SelectTrigger id="defaultOptionCount">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="4">4 alternativas</SelectItem>
                      <SelectItem value="5">5 alternativas</SelectItem>
                    </SelectContent>
                  </Select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <div className="flex justify-center">
          <Button className="w-full my-4" type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Criando..." : "Criar Fase"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
