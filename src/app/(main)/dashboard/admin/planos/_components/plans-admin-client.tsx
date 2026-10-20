"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import type { Plan } from "@/generated/prisma/browser";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatLimit, formatPrice, PLAN_AUDIENCE_LABEL, PLAN_LIMITS } from "@/lib/plan-labels";

import { PlanForm } from "./plan-form";

export function PlansAdminClient({ plans, canManage }: { plans: Plan[]; canManage: boolean }) {
  const router = useRouter();
  // undefined = closed, null = creating, Plan = editing
  const [editing, setEditing] = useState<Plan | null | undefined>(undefined);

  function handleSaved() {
    setEditing(undefined);
    router.refresh();
  }

  return (
    <div className="space-y-8">
      <section className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Planos</h1>
          <p className="text-muted-foreground">
            Planos, preços e limites ficam só aqui: mudanças valem na hora, sem alterar código.
          </p>
        </div>
        {canManage && <Button onClick={() => setEditing(null)}>Novo plano</Button>}
      </section>

      {plans.length === 0 ? (
        <p className="text-muted-foreground text-sm">Nenhum plano cadastrado.</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {plans.map((plan) => (
            <Card key={plan.id} className={plan.highlight ? "border-primary shadow-sm" : ""}>
              <CardHeader>
                <CardTitle className="flex flex-wrap items-center gap-2 text-base">
                  <span>{plan.label}</span>
                  {plan.isDefault && <Badge variant="secondary">Padrão</Badge>}
                  {!plan.isActive && <Badge variant="outline">Inativo</Badge>}
                </CardTitle>
                <CardDescription>{PLAN_AUDIENCE_LABEL[plan.audience]}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <p className="text-muted-foreground">{plan.description}</p>
                <p>
                  {plan.monthlyPrice === null && plan.yearlyPrice === null
                    ? "Gratuito"
                    : [
                        plan.monthlyPrice !== null && `${formatPrice(plan.monthlyPrice)}/mês`,
                        plan.yearlyPrice !== null && `${formatPrice(plan.yearlyPrice)}/ano`,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                </p>
                {((plan.monthlyPrice !== null && !plan.stripePriceId) ||
                  (plan.yearlyPrice !== null && !plan.stripeYearlyPriceId)) && (
                  <p className="text-destructive text-xs">Falta o Price ID do Stripe: este preço não está à venda.</p>
                )}
                <ul className="space-y-1">
                  {PLAN_LIMITS.filter((l) => l.audience === plan.audience).map((l) => (
                    <li key={l.column} className="flex justify-between gap-2">
                      <span className="text-muted-foreground">{l.label}</span>
                      <span className="font-medium">{formatLimit(plan[l.column])}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
              {canManage && (
                <CardFooter>
                  <Button variant="outline" size="sm" onClick={() => setEditing(plan)}>
                    Editar
                  </Button>
                </CardFooter>
              )}
            </Card>
          ))}
        </div>
      )}

      <Dialog open={editing !== undefined} onOpenChange={(open) => !open && setEditing(undefined)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar plano" : "Novo plano"}</DialogTitle>
            <DialogDescription>
              Crie o preço no painel do Stripe e cole aqui o Price ID para colocar o plano à venda.
            </DialogDescription>
          </DialogHeader>
          {editing !== undefined && <PlanForm key={editing?.id ?? "new"} plan={editing ?? undefined} onSaved={handleSaved} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
