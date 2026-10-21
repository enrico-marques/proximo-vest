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
import { AdminSubscriptionForm } from "./_components/admin-subscription-form";
import { listPlans } from "@/server/plans";
import { getSubscriptionForAdmin } from "@/server/subscription";

export default async function AdminSubscriptionEditPage({
  params,
}: {
  params: { userId: string };
}) {
  await requirePageAuth({
    emailVerified: true,
    blockSuspended: true,
    blockDeleted: true,
    perm: "subscription.manage",
    onForbiddenRedirect: "/dashboard",
  });

  const { userId } = await params;

  const [subscription, plans] = await Promise.all([
    getSubscriptionForAdmin(userId),
    listPlans({ includeInactive: true }),
  ]);

  if (!subscription) notFound();

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
