"use client";

import { useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { readApiError } from "@/lib/api-error";

type SubscribeButtonProps = {
  planId: string;
  interval: "MONTH" | "YEAR";
};

export function SubscribeButton({ planId, interval }: SubscribeButtonProps) {
  const [isLoading, start] = useTransition();

  function checkout() {
    start(async () => {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId, interval }),
      });

      if (!res.ok) {
        toast.error(await readApiError(res, "Não foi possível iniciar o pagamento."));
        return;
      }

      const { url } = (await res.json()) as { url?: string | null };
      if (url) window.location.href = url;
      else toast.error("Não foi possível iniciar o pagamento.");
    });
  }

  return (
    <Button onClick={checkout} disabled={isLoading} variant={interval === "YEAR" ? "outline" : "default"}>
      {isLoading ? "Carregando..." : interval === "YEAR" ? "Assinar anual" : "Assinar mensal"}
    </Button>
  );
}
