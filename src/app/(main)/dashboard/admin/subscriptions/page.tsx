// app/dashboard/admin/subscriptions/page.tsx
import { requirePageAuth } from "@/utils/access";
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
import type { Subscription, Plan, User } from "@/generated/prisma";
import { headers } from "next/headers";

export const dynamic = "force-dynamic";

type SubscriptionWithRelations = Subscription & {
  user: Pick<User, "id" | "email" | "name"> | null;
  plan: Plan | null;
};

export default async function AdminSubscriptionsPage() {
  await requirePageAuth({
    emailVerified: true,
    blockSuspended: true,
    blockDeleted: true,
    perm: ["subscription.read", "subscription.manage"],
    onForbiddenRedirect: "/dashboard",
  });

  const headersList = headers();

  const res = await fetch(
    `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/api/subscriptions`,
    {
      cache: "no-store",
      headers: {
        // encaminha os cookies da requisição atual pra sua API interna
        cookie: (await headersList).get("cookie") ?? "",
      },
    }
    
  );

  if (!res.ok) {
    throw new Error("Erro ao carregar assinaturas");
  }

  const subscriptions = (await res.json()) as SubscriptionWithRelations[];

  const now = new Date();

  return (
    <div className="space-y-6">
      <section className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Assinaturas
          </h1>
          <p className="text-muted-foreground">
            Visualize e administre as assinaturas dos usuários.
          </p>
        </div>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Lista de assinaturas</CardTitle>
          <CardDescription>
            Usuários, planos, status e informações de Stripe.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {subscriptions.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhuma assinatura encontrada.
            </p>
          ) : (
            <div className="space-y-3">
              {subscriptions.map((sub) => {
                const expiresAt = sub.expiresAt || null;
                const isExpired =
                  !!expiresAt && expiresAt < now;

                let statusLabel: string = sub.status;
                let statusVariant: "outline" | "secondary" | "destructive" =
                  "outline";

                if (sub.status === "ACTIVE") {
                  statusLabel = "Ativo";
                  statusVariant = "outline";
                } else if (sub.status === "CANCEL_AT_PERIOD_END") {
                  statusLabel = "Cancelado ao fim do período";
                  statusVariant = "secondary";
                } else if (sub.status === "CANCELED") {
                  statusLabel = "Cancelado";
                  statusVariant = "destructive";
                } else if (sub.status === "EXPIRED") {
                  statusLabel = "Expirado";
                  statusVariant = "destructive";
                }

                return (
                  <div
                    key={sub.userId}
                    className="flex items-center justify-between rounded-md border px-3 py-2"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium">
                          {sub.user?.name || "Usuário sem nome"}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {sub.user?.email}
                        </span>
                        <Badge variant={statusVariant}>
                          {statusLabel}
                        </Badge>
                        {isExpired && (
                          <Badge variant="destructive">
                            Vencida
                          </Badge>
                        )}
                      </div>

                      <p className="text-xs text-muted-foreground">
                        Plano:{" "}
                        <span className="font-semibold">
                          {sub.plan?.label ??
                            sub.planKey ??
                            "Sem plano"}
                        </span>{" "}
                        {sub.plan?.type && (
                          <span className="text-[11px]">
                            {" · "}
                            {sub.plan.type === "student"
                              ? "Aluno"
                              : sub.plan.type === "teacher"
                                ? "Professor"
                                : "Escola"}
                          </span>
                        )}
                      </p>

                      <p className="text-[11px] text-muted-foreground">
                        Stripe ID:{" "}
                        {sub.stripeSubscriptionId || "-"}
                      </p>

                      <p className="text-[11px] text-muted-foreground">
                        Criada em:{" "}
                        {sub.createdAt
                          ? new Date(
                              sub.createdAt
                            ).toLocaleDateString("pt-BR")
                          : "-"}
                        {sub.expiresAt && (
                          <>
                            {" · "}Válida até{" "}
                            {new Date(
                              sub.expiresAt
                            ).toLocaleDateString("pt-BR")}
                          </>
                        )}
                      </p>
                    </div>

                    <div className="flex gap-2">
                      <Button asChild size="sm" variant="outline">
                        <Link
                          href={`/dashboard/admin/subscriptions/${sub.userId}/edit`}
                        >
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
