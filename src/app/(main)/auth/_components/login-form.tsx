"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { authClient } from "../../../../lib/auth-client";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";

const FormSchema = z.object({
  email: z.email({ message: "Informe um e-mail válido." }),
  password: z.string().min(6, { message: "A senha deve ter pelo menos 6 caracteres." }),
});


export function LoginForm() {
  const router = useRouter();
  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      email: "",
      password: "",
    },
    mode: "onSubmit",
  });

  const onSubmit = async (data: z.infer<typeof FormSchema>) => {

    const res = await authClient.signIn.email(
      {
        email: data.email,
        password: data.password,
        callbackURL: "/dashboard",


      })

    if (res?.error) {
      // trate mensagens conforme seu UI/toast
      // ex.: InvalidCredentials, RateLimited, etc.
      toast.error(`${res.error.message}`);
      return;
    }

    // 2) checa perfil/sessão logo depois
    const me = await fetch("/api/auth/me", { cache: "no-store" }).then(r => r.json());

    // 3) redireciona conforme status
    if (me?.error === "Unauthorized") {
      alert("Falha ao criar sessão.");
      return;
    }
    if (!me.emailVerified) {
      router.replace("/auth/verify-email");
      return;
    }
    if (me.status === "suspended") {
      router.replace("/suspended");
      return;
    }
    if (me.status === "deleted") {
      router.replace("/deleted");
      return;
    }

    // ok
    router.replace("/dashboard");
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>E-mail</FormLabel>
              <FormControl>
                <Input id="email" type="email" placeholder="voce@exemplo.com" autoComplete="email" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Senha</FormLabel>
              <FormControl>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  autoComplete="current-password"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button className="w-full" type="submit">
          Entrar
        </Button>
      </form>
    </Form>
  );
}
