"use client";

import { useState } from "react";

import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";

export function ResendVerificationButton({ email }: { email: string }) {
  const [pending, setPending] = useState(false);

  async function handleClick() {
    setPending(true);
    const res = await authClient.sendVerificationEmail({ email, callbackURL: "/dashboard" });
    setPending(false);

    if (res.error) {
      toast.error(res.error.message ?? "Não foi possível reenviar o e-mail.");
      return;
    }
    toast.success("E-mail reenviado. Confira também a caixa de spam.");
  }

  return (
    <Button className="w-full" variant="outline" onClick={handleClick} disabled={pending}>
      {pending ? "Enviando..." : "Reenviar e-mail de confirmação"}
    </Button>
  );
}
