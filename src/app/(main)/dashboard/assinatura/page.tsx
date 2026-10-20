import type { PlanAudience, SubscriptionStatus } from "@/generated/prisma/client";
import { ManageSubscriptionButton } from "@/components/billing/manage-subscription-button";
import { SubscribeButton } from "@/components/billing/subscribe-button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { formatLimit, formatPrice, PLAN_AUDIENCE_LABEL, PLAN_LIMITS } from "@/lib/plan-labels";
import { getUsageSummary } from "@/server/limits";
import { listPlans, toPublicPlan, type PublicPlan } from "@/server/plans";
import { getUserSubscription, isActiveSubscription } from "@/server/subscription";
import { can } from "@/utils/access-core";
import { requirePageAuth } from "@/utils/access";

const STATUS_LABEL: Record<SubscriptionStatus, string> = {
  ACTIVE: "Ativa",
  CANCEL_AT_PERIOD_END: "Cancelada ao fim do período",
  CANCELED: "Cancelada",
  EXPIRED: "Expirada",
};

function PlanLimits({ plan }: { plan: PublicPlan }) {
  const limits = PLAN_LIMITS.filter((l) => l.audience === plan.audience);
  if (limits.length === 0) return null;
  return (
    <ul className="space-y-1 text-sm">
      {limits.map((l) => (
        <li key={l.column} className="flex justify-between gap-2">
          <span className="text-muted-foreground">{l.label}</span>
          <span className="font-medium">{formatLimit(plan[l.column])}</span>
        </li>
      ))}
    </ul>
  );
}

function PlanPrice({ plan }: { plan: PublicPlan }) {
  if (plan.monthlyPrice === null && plan.yearlyPrice === null) {
    return <p className="text-2xl font-bold">Gratuito</p>;
  }
  return (
    <div className="space-y-1">
      {plan.monthlyPrice !== null && (
        <p className="text-2xl font-bold">
          {formatPrice(plan.monthlyPrice)}
          <span className="text-muted-foreground text-sm font-normal">/mês</span>
        </p>
      )}
      {plan.yearlyPrice !== null && (
        <p className="text-muted-foreground text-sm">ou {formatPrice(plan.yearlyPrice)}/ano</p>
      )}
    </div>
  );
}

export default async function AssinaturaPage() {
  const { session, profile } = await requirePageAuth({
    emailVerified: true,
    blockSuspended: true,
    blockDeleted: true,
  });
  const userId = session.user.id;

  // Teachers also see their teacher limits; everyone sees the student ones.
  const audiences: PlanAudience[] = can(profile, { perm: "teacherList.manage" })
    ? ["STUDENT", "TEACHER"]
    : ["STUDENT"];

  const [subscription, plans, ...usages] = await Promise.all([
    getUserSubscription(userId),
    listPlans(),
    ...audiences.map((audience) => getUsageSummary(userId, audience)),
  ]);

  const active = isActiveSubscription(subscription);
  const visiblePlans = plans.map(toPublicPlan).filter((p) => audiences.includes(p.audience));

  return (
    <div className="space-y-8">
      <section>
        <h1 className="text-2xl font-bold tracking-tight">Assinatura</h1>
        <p className="text-muted-foreground">Seu plano, seu uso no período e os planos disponíveis.</p>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Sua assinatura</CardTitle>
            <CardDescription>
              Vinculada a <span className="font-medium">{session.user.email}</span>.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {subscription ? (
              <>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-lg font-semibold">{subscription.plan.label}</span>
                  <Badge variant={active ? "outline" : "destructive"}>{STATUS_LABEL[subscription.status]}</Badge>
                  <Badge variant="outline">
                    {subscription.billingInterval === "YEAR" ? "Cobrança anual" : "Cobrança mensal"}
                  </Badge>
                </div>
                {subscription.expiresAt && active && (
                  <p className="text-muted-foreground">
                    {subscription.status === "CANCEL_AT_PERIOD_END" ? "Acesso até " : "Renova em "}
                    <span className="font-medium">{subscription.expiresAt.toLocaleDateString("pt-BR")}</span>.
                  </p>
                )}
              </>
            ) : (
              <p className="text-muted-foreground">Você não tem uma assinatura paga e usa o plano gratuito.</p>
            )}
          </CardContent>
          {subscription?.stripeCustomerId && (
            <CardFooter>
              <ManageSubscriptionButton>Gerenciar assinatura</ManageSubscriptionButton>
            </CardFooter>
          )}
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Seu uso</CardTitle>
            <CardDescription>Limites do plano que vale para você agora.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            {usages.map(({ plan, usage }, i) => (
              <div key={audiences[i]} className="space-y-1">
                <p className="font-medium">
                  {PLAN_AUDIENCE_LABEL[audiences[i]]}: {plan?.label ?? "nenhum plano configurado"}
                </p>
                <ul className="space-y-1">
                  {usage.map((u) => (
                    <li key={u.metric} className="flex justify-between gap-2">
                      <span className="text-muted-foreground">{u.label}</span>
                      <span>{u.limit === null || u.limit === 0 ? formatLimit(u.limit) : `${u.used} de ${u.limit}`}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Planos</h2>
        {visiblePlans.length === 0 ? (
          <p className="text-muted-foreground text-sm">Nenhum plano disponível no momento.</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {visiblePlans.map((plan) => {
              const isCurrent = active && subscription?.planId === plan.id;
              return (
                <Card key={plan.id} className={plan.highlight ? "border-primary shadow-sm" : ""}>
                  <CardHeader>
                    <div className="flex items-center justify-between gap-2">
                      <CardTitle className="text-base">{plan.label}</CardTitle>
                      {plan.highlight && <Badge>Recomendado</Badge>}
                    </div>
                    <CardDescription>{plan.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <PlanPrice plan={plan} />
                    <PlanLimits plan={plan} />
                  </CardContent>
                  <CardFooter className="flex flex-wrap gap-2">
                    {isCurrent ? (
                      <Badge variant="outline">Plano atual</Badge>
                    ) : (
                      <>
                        {plan.sellsMonthly && <SubscribeButton planId={plan.id} interval="MONTH" />}
                        {plan.sellsYearly && <SubscribeButton planId={plan.id} interval="YEAR" />}
                      </>
                    )}
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
