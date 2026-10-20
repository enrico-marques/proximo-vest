// app/dashboard/admin/subscriptions/[userId]/edit/_components/admin-subscription-form.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Subscription, Plan, User } from "@/generated/prisma/browser";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

type SubscriptionWithRelations = Subscription & {
  user: Pick<User, "id" | "email" | "name">;
  plan: Plan | null;
};

type Props = {
  subscription: SubscriptionWithRelations;
  plans: Plan[];
};

export function AdminSubscriptionForm({ subscription, plans }: Props) {
  const router = useRouter();

  // plano pode ser `null` → usamos `undefined` internamente
  const [planKey, setPlanKey] = useState<string | undefined>(
    subscription.planKey ?? undefined
  );

  const [status, setStatus] = useState(subscription.status);
  const [stripeId, setStripeId] = useState(
    subscription.stripeSubscriptionId ?? ""
  );

  // expiresAt pode vir como Date (SSR) ou string (JSON da API)
  const [expiresAt, setExpiresAt] = useState(() => {
    if (!subscription.expiresAt) return "";

    const date =
      subscription.expiresAt instanceof Date
        ? subscription.expiresAt
        : new Date(subscription.expiresAt as any);

    if (Number.isNaN(date.getTime())) return "";
    return date.toISOString().slice(0, 10); // formato yyyy-mm-dd pro input[type=date]
  });

  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      setLoading(true);

      const res = await fetch(
        `/api/subscriptions/${subscription.userId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            // se não tiver plano, mandamos null
            planKey: planKey ?? null,
            status,
            stripeSubscriptionId: stripeId || null,
            expiresAt: expiresAt || null,
          }),
        }
      );

      if (!res.ok) {
        throw new Error("Erro ao atualizar assinatura");
      }

      toast.success("Assinatura atualizada com sucesso!");
      router.push("/dashboard/admin/subscriptions");
      router.refresh();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Erro ao salvar");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div className="space-y-1">
        <Label>Usuário</Label>
        <p className="text-sm">
          <span className="font-medium">
            {subscription.user.name || "Sem nome"}
          </span>{" "}
          <span className="text-muted-foreground">
            ({subscription.user.email})
          </span>
        </p>
      </div>

      <div className="space-y-1">
        <Label htmlFor="planKey">Plano</Label>
        <Select
          // se não tiver plano, usamos "__none" como valor sentinela
          value={planKey ?? "__none"}
          onValueChange={(val) => {
            setPlanKey(val === "__none" ? undefined : val);
          }}
        >
          <SelectTrigger id="planKey">
            <SelectValue placeholder="Selecione um plano" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none">Sem plano</SelectItem>
            {plans.map((p) => (
              <SelectItem key={p.key} value={p.key}>
                {p.label}{" "}
                {p.monthlyPrice !== null &&
                  `- R$ ${p.monthlyPrice.toFixed(2)}/mês`}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1">
        <Label htmlFor="status">Status</Label>
        <Select
          value={status}
          onValueChange={(val) =>
            setStatus(
              val as
                | "ACTIVE"
                | "CANCEL_AT_PERIOD_END"
                | "CANCELED"
                | "EXPIRED"
            )
          }
        >
          <SelectTrigger id="status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ACTIVE">Ativo</SelectItem>
            <SelectItem value="CANCEL_AT_PERIOD_END">
              Cancelado ao fim do período
            </SelectItem>
            <SelectItem value="CANCELED">Cancelado</SelectItem>
            <SelectItem value="EXPIRED">Expirado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1">
        <Label htmlFor="expiresAt">Válido até</Label>
        <Input
          id="expiresAt"
          type="date"
          value={expiresAt}
          onChange={(e) => setExpiresAt(e.target.value)}
        />
        <p className="text-[11px] text-muted-foreground">
          Deixe vazio para não controlar validade manualmente (usa só o
          status).
        </p>
      </div>

      <div className="space-y-1">
        <Label htmlFor="stripeId">Stripe Subscription ID</Label>
        <Input
          id="stripeId"
          value={stripeId}
          onChange={(e) => setStripeId(e.target.value)}
          placeholder="sub_..."
        />
        <p className="text-[11px] text-muted-foreground">
          Preencha para vincular com uma assinatura do Stripe ou deixe
          vazio para desvincular.
        </p>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
        >
          Voltar
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? "Salvando..." : "Salvar alterações"}
        </Button>
      </div>
    </form>
  );
}
