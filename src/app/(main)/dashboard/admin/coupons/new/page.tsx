// app/dashboard/admin/coupons/new/page.tsx
"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { errorMessage } from "@/lib/api-error";


export default function NewCouponPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(formData: FormData) {
    try {
      setIsSubmitting(true);

      const payload = {
        code: String(formData.get("code") || "").toUpperCase(),
        type: formData.get("type") || "PERCENT",
        discountValue: Number(formData.get("discountValue") || 0),
        validFor: formData.get("validFor") || "ANY_PLAN",
        redeemLimit: formData.get("redeemLimit")
          ? Number(formData.get("redeemLimit"))
          : null,
        expiresAt: formData.get("expiresAt") || null,
      };

      const res = await fetch("/api/coupons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error("Erro ao criar cupom");
      }

      toast.success("Cupom criado com sucesso!");
      router.push("/dashboard/admin/coupons");
    } catch (err) {
      console.error(err);
      toast.error(errorMessage(err) || "Erro ao criar cupom");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="max-w-xl">
      <Card>
        <CardHeader>
          <CardTitle>Novo cupom</CardTitle>
          <CardDescription>
            Crie um cupom de desconto para ser usado na assinatura.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              handleSubmit(new FormData(e.currentTarget));
            }}
          >
            <div className="space-y-1">
              <Label htmlFor="code">Código</Label>
              <Input
                id="code"
                name="code"
                placeholder="EX: VEST20"
                required
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="type">Tipo de desconto</Label>
              <select
                id="type"
                name="type"
                className="border rounded-md px-2 py-1 text-sm"
                defaultValue="PERCENT"
              >
                <option value="PERCENTAGE">% (porcentagem)</option>
                <option value="FIXED">R$ (valor fixo)</option>
                 <option value="FREE_MONTH">Mês grátis</option>
              </select>
            </div>

            <div className="space-y-1">
              <Label htmlFor="discountValue">
                Valor do desconto{" "}
                <span className="text-xs text-muted-foreground">
                  (% ou R$, dependendo do tipo)
                </span>
              </Label>
              <Input
                id="discountValue"
                name="discountValue"
                type="number"
                step="0.01"
                required
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="validFor">Válido para</Label>
              <select
                id="validFor"
                name="validFor"
                className="border rounded-md px-2 py-1 text-sm"
                defaultValue="ANY_PLAN"
              >
                {/* Ajuste essas opções para o que você tiver no enum CouponTarget */}
                <option value="ALL">Qualquer plano</option>
                <option value="STUDENT">Somente planos de aluno</option>
                <option value="TEACHER">Somente planos de professor</option>
                <option value="SCHOOL">Somente planos de escola</option>
              </select>
            </div>

            <div className="space-y-1">
              <Label htmlFor="redeemLimit">
                Limite de usos (opcional)
              </Label>
              <Input
                id="redeemLimit"
                name="redeemLimit"
                type="number"
                min={1}
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="expiresAt">Válido até (opcional)</Label>
              <Input id="expiresAt" name="expiresAt" type="date" />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Salvando..." : "Criar cupom"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
