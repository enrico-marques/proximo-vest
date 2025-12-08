// app/dashboard/admin/subscriptions/[userId]/edit/page.tsx
import { requirePageAuth } from "@/utils/access";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { notFound } from "next/navigation";
import type { Subscription, Plan, User } from "@/generated/prisma";
import { AdminSubscriptionForm } from "./_components/admin-subscription-form";
import { headers } from "next/headers";

type SubscriptionWithRelations = Subscription & {
  user: Pick<User, "id" | "email" | "name">;
  plan: Plan | null;
};

export default async function AdminSubscriptionEditPage({
  params,
}: {
  params: { userId: string };
}) {
  await requirePageAuth({
    emailVerified: true,
    blockSuspended: true,
    blockDeleted: true,
    // requiredRoles: ["ADMIN"],
    onForbiddenRedirect: "/dashboard",
  });

  const { userId } = await params;
  const headersList = headers();

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";

  const [subRes, plansRes] = await Promise.all([
    fetch(`${process.env.API_URL}/subscriptions/${userId}`, {
      cache: "no-store",
      headers: {
        // encaminha os cookies da requisição atual pra sua API interna
        cookie: (await headersList).get("cookie") ?? "",
      },
    }),
    fetch(`${process.env.API_URL}/plans/available`, {
      cache: "no-store",
      headers: {
        // encaminha os cookies da requisição atual pra sua API interna
        cookie: (await headersList).get("cookie") ?? "",
      },
    }),
  ]);

  if (subRes.status === 404) {
    return notFound();
  }

  if (!subRes.ok) {
    throw new Error("Erro ao carregar assinatura");
  }

  if (!plansRes.ok) {
    throw new Error("Erro ao carregar planos");
  }

  const subscription =
    (await subRes.json()) as SubscriptionWithRelations;
  const plans = (await plansRes.json()) as Plan[];

  return (
    <div className="max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>Editar assinatura</CardTitle>
          <CardDescription>
            Ajuste manualmente o plano, status e validade da assinatura
            do usuário.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AdminSubscriptionForm
            subscription={subscription}
            plans={plans}
          />
        </CardContent>
      </Card>
    </div>
  );
}
