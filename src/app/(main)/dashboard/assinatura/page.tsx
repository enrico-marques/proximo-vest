import { requirePageAuth } from "@/utils/access";
import { isActiveSubscription } from "@/server/subscription";
import type { Plan } from "@/generated/prisma";
import { SubscribeButton } from "@/components/billing/subscribe-button";
import { ManageSubscriptionButton } from "@/components/billing/manage-subscription-button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { headers } from "next/headers";

export default async function AssinaturaPage() {
  const { session, subscription, limits } = await requirePageAuth({
    emailVerified: true,
    blockSuspended: true,
    blockDeleted: true,
  });
  const headersList = headers();

  const subscriptionActive = isActiveSubscription(subscription);
  const currentPlanKey = subscription?.planKey ?? null;
  const currentPlanType = subscription?.plan?.type ?? "student";
  const billingInterval = (subscription as any)?.billingInterval ?? "MONTH";

  // Busca planos via API (sem Prisma direto na página)
  const res = await fetch(`${process.env.API_URL}/plans/available`, {
    cache: "no-store",
            headers: {
      // encaminha os cookies da requisição atual pra sua API interna
      cookie: (await headersList).get("cookie") ?? "",
    },
  });

  if (!res.ok) {
    throw new Error("Erro ao carregar planos disponíveis.");
  }

  const plans = (await res.json()) as Plan[];

  const currentPlanConfig = currentPlanKey
    ? plans.find((p) => p.key === currentPlanKey) ?? null
    : null;

  // Calcula preço do plano atual conforme o intervalo
  const currentPrice =
    billingInterval === "YEAR"
      ? currentPlanConfig?.yearlyPrice ?? currentPlanConfig?.monthlyPrice ?? null
      : currentPlanConfig?.monthlyPrice ?? currentPlanConfig?.yearlyPrice ?? null;

  const currentPriceSuffix = billingInterval === "YEAR" ? "/ano" : "/mês";

  return (
    <div className="space-y-8">
      {/* Cabeçalho */}
      <section>
        <h1 className="text-2xl font-bold tracking-tight">Assinatura</h1>
        <p className="text-muted-foreground">
          Gerencie seu plano do Próximo Vest e veja os benefícios disponíveis
          para você.
        </p>
      </section>

      {/* Plano atual */}
      <section>
        <Card>
          <CardHeader>
            <CardTitle>Seu plano atual</CardTitle>
            <CardDescription>
              Informações da sua assinatura vinculada a{" "}
              <span className="font-medium">{session.user.email}</span>.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {subscription ? (
              <>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-lg font-semibold">
                    {currentPlanConfig?.label ?? "Plano desconhecido"}
                  </span>

                  {/* Status */}
                  {subscription.status === "ACTIVE" && (
                    <Badge variant="outline">Ativo</Badge>
                  )}
                  {subscription.status === "CANCEL_AT_PERIOD_END" && (
                    <Badge variant="destructive">
                      Cancelado ao fim do período
                    </Badge>
                  )}
                  {subscription.status === "CANCELED" && (
                    <Badge variant="destructive">Cancelado</Badge>
                  )}
                  {subscription.status === "EXPIRED" && (
                    <Badge variant="destructive">Expirado</Badge>
                  )}

                  {/* Intervalo de cobrança */}
                  <Badge variant="outline">
                    {billingInterval === "YEAR" ? "Plano anual" : "Plano mensal"}
                  </Badge>
                </div>

                {/* Valor do plano atual */}
                {currentPlanConfig &&
                currentPlanConfig.monthlyPrice === null &&
                currentPlanConfig.yearlyPrice === null ? (
                  <p className="text-sm text-muted-foreground">
                    Este é um plano gratuito.
                  </p>
                ) : currentPrice != null ? (
                  <p className="text-sm text-muted-foreground">
                    Valor: R$ {currentPrice.toFixed(2)}
                    {currentPriceSuffix}
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Não foi possível determinar o valor deste plano.
                  </p>
                )}

                {currentPlanConfig?.description && (
                  <p className="text-sm text-muted-foreground">
                    {currentPlanConfig.description}
                  </p>
                )}

                {/* mensagem de validade */}
                {subscription.status === "CANCEL_AT_PERIOD_END" &&
                  subscription.expiresAt && (
                    <p className="text-xs text-muted-foreground">
                      Sua assinatura foi cancelada, mas continuará ativa até{" "}
                      <span className="font-medium">
                        {subscription.expiresAt.toLocaleDateString("pt-BR")}
                      </span>
                      .
                    </p>
                  )}

                {subscription.status === "ACTIVE" &&
                  subscription.expiresAt &&
                  subscription.expiresAt > new Date() && (
                    <p className="text-xs text-muted-foreground">
                      Renovação prevista para{" "}
                      <span className="font-medium">
                        {subscription.expiresAt.toLocaleDateString("pt-BR")}
                      </span>
                      .
                    </p>
                  )}

                {/* limites do plano */}
                {limits && (
                  <p className="text-xs text-muted-foreground">
                    Limites deste plano:{" "}
                    {currentPlanType === "student" ? (
                      <>
                        <span className="font-medium">
                          {limits.essayCreditsPerMonth} redações/mês
                        </span>{" "}
                        •{" "}
                        {limits.unlimitedQuestions
                          ? "questões ilimitadas"
                          : "questões limitadas"}
                      </>
                    ) : currentPlanType === "teacher" ? (
                      <>
                        <span className="font-medium">
                          {limits.unlimitedLists
                            ? "listas/simulados ilimitados"
                            : `${limits.listLimitPerMonth} listas/simulados por mês`}
                        </span>{" "}
                        •{" "}
                        {limits.unlimitedQuestions
                          ? "questões ilimitadas"
                          : "questões limitadas"}
                      </>
                    ) : (
                      <>Plano institucional / personalizado</>
                    )}
                  </p>
                )}

                {/* botão portal Stripe se ainda tiver acesso */}
                {subscriptionActive && (
                  <div className="pt-2">
                    <ManageSubscriptionButton>
                      Gerenciar assinatura (Stripe)
                    </ManageSubscriptionButton>
                  </div>
                )}
              </>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">
                  Você ainda não possui uma assinatura ativa. Atualmente, está
                  no plano padrão gratuito ou sem plano vinculado.
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </section>

      {/* Lista de planos disponíveis */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Escolha um plano</h2>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {plans.map((plan) => {
            const isCurrent = plan.key === currentPlanKey;
            const isFree =
              plan.monthlyPrice === null && plan.yearlyPrice === null;

            return (
              <Card
                key={plan.id}
                className={plan.highlight ? "border-primary shadow-sm" : ""}
              >
                <CardHeader>
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle className="text-base">{plan.label}</CardTitle>
                    {plan.highlight && <Badge>Recomendado</Badge>}
                  </div>
                  <CardDescription>{plan.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {isFree ? (
                      "Gratuito"
                    ) : plan.monthlyPrice != null ? (
                      <>
                        R$ {plan.monthlyPrice.toFixed(2)}{" "}
                        <span className="text-sm font-normal text-muted-foreground">
                          /mês
                        </span>
                      </>
                    ) : plan.yearlyPrice != null ? (
                      <>
                        R$ {plan.yearlyPrice.toFixed(2)}{" "}
                        <span className="text-sm font-normal text-muted-foreground">
                          /ano
                        </span>
                      </>
                    ) : (
                      "-"
                    )}
                  </div>

                  {plan.yearlyPrice != null && plan.monthlyPrice != null && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Também disponível no plano anual por R${" "}
                      {plan.yearlyPrice.toFixed(2)}/ano.
                    </p>
                  )}

                  <p className="mt-2 text-xs text-muted-foreground">
                    Tipo:{" "}
                    {plan.type === "student"
                      ? "Aluno"
                      : plan.type === "teacher"
                      ? "Professor"
                      : "Escola"}
                  </p>
                </CardContent>
                <CardFooter className="flex justify-between items-center">
                  {isCurrent ? (
                    <Badge variant="outline">Plano atual</Badge>
                  ) : (
                    // por enquanto ainda só mensal — depois dá pra passar o intervalo aqui
                    <SubscribeButton planKey={plan.key} />
                  )}
                </CardFooter>
              </Card>
            );
          })}
        </div>
      </section>
    </div>
  );
}
