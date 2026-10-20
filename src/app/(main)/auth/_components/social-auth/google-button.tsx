"use client";
import { siGoogle } from "simple-icons";
import { SimpleIcon } from "@/components/simple-icon";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { useState } from "react";
import { authClient } from "../../../../../lib/auth-client";

export function GoogleButton({ className, ...props }: React.ComponentProps<typeof Button>) {

  const [loading, setLoading] = useState(false)

  const handleSignIn = async () => {
    try {
      setLoading(true)
      await authClient.signIn.social({
        provider: "google",
        // opcional: para voltar a uma página específica
        callbackURL: "/dashboard",
      })
      // não precisa fazer mais nada: o fluxo redireciona
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button onClick={handleSignIn} disabled={loading} variant="secondary" className={cn(className)} {...props}>
      <SimpleIcon icon={siGoogle} className="size-4" />
      Continuar com Google
    </Button>
  );
}
