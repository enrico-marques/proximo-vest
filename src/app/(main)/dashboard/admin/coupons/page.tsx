// app/dashboard/admin/coupons/page.tsx
import { requirePageAuth } from "@/utils/access";
import { prisma } from "@/lib/prisma";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { CouponType } from "@/generated/prisma/client";

export const dynamic = "force-dynamic";

export default async function AdminCouponsPage() {
  await requirePageAuth({
    emailVerified: true,
    blockSuspended: true,
    blockDeleted: true,
    perm: "coupon.manage",
    onForbiddenRedirect: "/dashboard",
  });

  const coupons = await prisma.coupon.findMany({
    orderBy: { createdAt: "desc" },
  });

  const now = new Date();

  return (
    <div className="space-y-6">
      <section className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Cupons de desconto
          </h1>
          <p className="text-muted-foreground">
            Gerencie cupons promocionais do Próximo Vest.
          </p>
        </div>

        <Button asChild>
          <Link href="/dashboard/admin/coupons/new">Novo cupom</Link>
        </Button>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Lista de cupons</CardTitle>
          <CardDescription>
            Veja todos os cupons cadastrados e seu status atual.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {coupons.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhum cupom cadastrado ainda.
            </p>
          ) : (
            <div className="space-y-3">
              {coupons.map((c) => {
                const isExpired = c.expiresAt && c.expiresAt < now;
                const isLimited = c.redeemLimit !== null;
                const isExhausted =
                  isLimited && c.used >= (c.redeemLimit ?? 0);
                const isActive = !isExpired && !isExhausted;

                return (
                  <div
                    key={c.id}
                    className="flex items-center justify-between rounded-md border px-3 py-2"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-semibold">
                          {c.code}
                        </span>

                        {isActive ? (
                          <Badge variant="outline">Ativo</Badge>
                        ) : isExpired ? (
                          <Badge variant="destructive">Expirado</Badge>
                        ) : (
                          <Badge variant="destructive">Esgotado</Badge>
                        )}
                      </div>

                      <p className="text-xs text-muted-foreground mt-0.5">
                        {c.type === CouponType.PERCENTAGE
                          ? `Desconto de ${c.discountValue}%`
                          : `Desconto de R$ ${c.discountValue.toFixed(2)}`}
                        {" · "}
                        alvo:{" "}
                        <span className="font-semibold">
                          {c.validFor}
                        </span>
                      </p>

                      <p className="text-[11px] text-muted-foreground">
                        Usos:{" "}
                        {c.redeemLimit
                          ? `${c.used}/${c.redeemLimit}`
                          : `${c.used} (ilimitado)`}
                      </p>

                      {c.expiresAt && (
                        <p className="text-[11px] text-muted-foreground">
                          Válido até{" "}
                          {c.expiresAt.toLocaleDateString("pt-BR")}
                        </p>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <Button asChild size="sm" variant="outline">
                        <Link href={`/dashboard/admin/coupons/${c.id}/edit`}>
                          Editar
                        </Link>
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
