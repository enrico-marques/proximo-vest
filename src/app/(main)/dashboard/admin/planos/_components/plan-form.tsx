"use client";

import { useState } from "react";
import { toast } from "sonner";

import type { Plan, PlanAudience } from "@/generated/prisma/browser";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { readApiError } from "@/lib/api-error";
import { PLAN_AUDIENCE_LABEL, PLAN_LIMITS, type PlanLimitColumn } from "@/lib/plan-labels";

type FormState = {
  label: string;
  description: string;
  audience: PlanAudience;
  monthlyPrice: string;
  yearlyPrice: string;
  stripePriceId: string;
  stripeYearlyPriceId: string;
  limits: Record<PlanLimitColumn, string>;
  isDefault: boolean;
  highlight: boolean;
  isActive: boolean;
  sortOrder: string;
};

const toField = (value: number | null) => (value === null ? "" : String(value));
const toNumber = (value: string) => (value.trim() === "" ? null : Number(value.replace(",", ".")));

function initialState(plan?: Plan): FormState {
  return {
    label: plan?.label ?? "",
    description: plan?.description ?? "",
    audience: plan?.audience ?? "STUDENT",
    monthlyPrice: toField(plan?.monthlyPrice ?? null),
    yearlyPrice: toField(plan?.yearlyPrice ?? null),
    stripePriceId: plan?.stripePriceId ?? "",
    stripeYearlyPriceId: plan?.stripeYearlyPriceId ?? "",
    limits: {
      questionsPerDay: toField(plan ? plan.questionsPerDay : 0),
      essayCreditsPerMonth: toField(plan ? plan.essayCreditsPerMonth : 0),
      listsPerMonth: toField(plan ? plan.listsPerMonth : 0),
    },
    isDefault: plan?.isDefault ?? false,
    highlight: plan?.highlight ?? false,
    isActive: plan?.isActive ?? true,
    sortOrder: String(plan?.sortOrder ?? 0),
  };
}

export function PlanForm({ plan, onSaved }: { plan?: Plan; onSaved: () => void }) {
  const [form, setForm] = useState(() => initialState(plan));
  const [saving, setSaving] = useState(false);
  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((f) => ({ ...f, [key]: value }));

  const audienceLimits = PLAN_LIMITS.filter((l) => l.audience === form.audience);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    // Limits that do not apply to the chosen audience are stored as null.
    const limits = Object.fromEntries(
      PLAN_LIMITS.map((l) => [l.column, l.audience === form.audience ? toNumber(form.limits[l.column]) : null]),
    );

    const res = await fetch(plan ? `/api/plans/${plan.id}` : "/api/plans", {
      method: plan ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        label: form.label,
        description: form.description,
        audience: form.audience,
        monthlyPrice: toNumber(form.monthlyPrice),
        yearlyPrice: toNumber(form.yearlyPrice),
        stripePriceId: form.stripePriceId.trim() || null,
        stripeYearlyPriceId: form.stripeYearlyPriceId.trim() || null,
        ...limits,
        isDefault: form.isDefault,
        highlight: form.highlight,
        isActive: form.isActive,
        sortOrder: Number(form.sortOrder) || 0,
      }),
    });
    setSaving(false);

    if (!res.ok) {
      toast.error(await readApiError(res, "Não foi possível salvar o plano."));
      return;
    }
    toast.success(plan ? "Plano atualizado." : "Plano criado.");
    onSaved();
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
      <div className="space-y-2 md:col-span-2">
        <Label htmlFor="label">Nome</Label>
        <Input id="label" value={form.label} onChange={(e) => set("label", e.target.value)} required />
      </div>

      <div className="space-y-2 md:col-span-2">
        <Label htmlFor="description">Descrição</Label>
        <Textarea
          id="description"
          value={form.description}
          onChange={(e) => set("description", e.target.value)}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="audience">Público</Label>
        <Select value={form.audience} onValueChange={(v) => set("audience", v as PlanAudience)}>
          <SelectTrigger id="audience">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(PLAN_AUDIENCE_LABEL) as PlanAudience[]).map((a) => (
              <SelectItem key={a} value={a}>
                {PLAN_AUDIENCE_LABEL[a]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="sortOrder">Ordem de exibição</Label>
        <Input
          id="sortOrder"
          type="number"
          step="1"
          value={form.sortOrder}
          onChange={(e) => set("sortOrder", e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="monthlyPrice">Preço mensal (R$)</Label>
        <Input
          id="monthlyPrice"
          inputMode="decimal"
          placeholder="Vazio = não vende mensal"
          value={form.monthlyPrice}
          onChange={(e) => set("monthlyPrice", e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="stripePriceId">Stripe Price ID (mensal)</Label>
        <Input
          id="stripePriceId"
          placeholder="price_..."
          value={form.stripePriceId}
          onChange={(e) => set("stripePriceId", e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="yearlyPrice">Preço anual (R$)</Label>
        <Input
          id="yearlyPrice"
          inputMode="decimal"
          placeholder="Vazio = não vende anual"
          value={form.yearlyPrice}
          onChange={(e) => set("yearlyPrice", e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="stripeYearlyPriceId">Stripe Price ID (anual)</Label>
        <Input
          id="stripeYearlyPriceId"
          placeholder="price_..."
          value={form.stripeYearlyPriceId}
          onChange={(e) => set("stripeYearlyPriceId", e.target.value)}
        />
      </div>

      {audienceLimits.length > 0 && (
        <fieldset className="space-y-3 rounded-md border p-3 md:col-span-2">
          <legend className="px-1 text-sm font-medium">Limites</legend>
          <p className="text-muted-foreground text-xs">Vazio = ilimitado. 0 = não incluso no plano.</p>
          <div className="grid gap-3 md:grid-cols-2">
            {audienceLimits.map((l) => (
              <div key={l.column} className="space-y-2">
                <Label htmlFor={l.column}>{l.label}</Label>
                <Input
                  id={l.column}
                  type="number"
                  min={0}
                  step={1}
                  placeholder="ilimitado"
                  value={form.limits[l.column]}
                  onChange={(e) => set("limits", { ...form.limits, [l.column]: e.target.value })}
                />
              </div>
            ))}
          </div>
        </fieldset>
      )}

      <div className="space-y-3 md:col-span-2">
        <div className="flex items-center gap-2">
          <Switch id="isDefault" checked={form.isDefault} onCheckedChange={(v) => set("isDefault", v)} />
          <Label htmlFor="isDefault">Plano padrão de quem não assina (substitui o padrão atual deste público)</Label>
        </div>
        <div className="flex items-center gap-2">
          <Switch id="highlight" checked={form.highlight} onCheckedChange={(v) => set("highlight", v)} />
          <Label htmlFor="highlight">Destacar como recomendado</Label>
        </div>
        <div className="flex items-center gap-2">
          <Switch id="isActive" checked={form.isActive} onCheckedChange={(v) => set("isActive", v)} />
          <Label htmlFor="isActive">Visível e à venda</Label>
        </div>
      </div>

      <div className="flex justify-end md:col-span-2">
        <Button type="submit" disabled={saving}>
          {saving ? "Salvando..." : plan ? "Salvar alterações" : "Criar plano"}
        </Button>
      </div>
    </form>
  );
}
