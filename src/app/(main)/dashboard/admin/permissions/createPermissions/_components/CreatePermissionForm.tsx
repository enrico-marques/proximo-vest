"use client";

import { useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";

import { z } from "zod";
import { apiErrorMessage, errorMessage } from "@/lib/api-error";

export const PermissionsCreateSchema = z.object({
  resource: z.string().min(1, "Recurso obrigatório"), // "exam"
  action: z.string().min(1, "Ação obrigatória"), // "publish"
  isActive: z.boolean(),
  key: z.string()
});

type PermissionsCreateSchema = z.infer<typeof PermissionsCreateSchema>;

export function CreatePermissionForm() {
  const router = useRouter();

  const form = useForm<PermissionsCreateSchema>({
    resolver: zodResolver(PermissionsCreateSchema),
    defaultValues: {
      resource: "",
      action: "",
      isActive: true,
      key: "",
    },
  });

  const { isSubmitting } = form.formState;

  const resource = form.watch("resource");
  const action = form.watch("action");

  useEffect(() => {
    if (resource && action) {
      form.setValue("key", `${resource}.${action}`, {
        shouldValidate: true,
        shouldDirty: true,
      });
    } else {
      form.setValue("key", "", {
        shouldValidate: true,
        shouldDirty: true,
      });
    }
  }, [resource, action, form]);

  async function onSubmit(values: PermissionsCreateSchema) {
    try {
      const res = await fetch("/api/permissions/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(apiErrorMessage(data, "Erro ao criar permissão."));
      }

      toast.success("Permissão criada com sucesso!");
      router.push("/dashboard/admin/permissions");
    } catch (err) {
      console.error(err);
      toast.error(errorMessage(err) || "Erro inesperado ao criar permissão.");
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 w-full">
        <FormField
          control={form.control}
          name="resource"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Recurso</FormLabel>
              <FormControl>
                <Input
                  placeholder='Ex: "exam", "user", "question"...'
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="action"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Ação</FormLabel>
              <FormControl>
                <Input
                  placeholder='Ex: "create", "edit", "publish"...'
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="key"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Key (gerada automaticamente)</FormLabel>
              <FormControl>
                <Input {...field} disabled placeholder="resource.action" />
              </FormControl>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="isActive"
          render={({ field }) => (
            <FormItem className="flex items-center justify-between rounded-md border p-3">
              <div className="space-y-0.5">
                <FormLabel>Permissão ativa</FormLabel>
                <p className="text-xs text-muted-foreground">
                  Desative para impedir que essa permissão seja usada em novos
                  vínculos.
                </p>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
            </FormItem>
          )}
        />

        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Criando..." : "Criar permissão"}
        </Button>
      </form>
    </Form>
  );
}
