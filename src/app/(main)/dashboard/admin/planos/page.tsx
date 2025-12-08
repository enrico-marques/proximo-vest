import { requirePageAuth } from "@/utils/access";
import { PlansAdminClient } from "./_components/plans-admin-client";
import { headers } from "next/headers";

export default async function PlansAdminPage() {
  await requirePageAuth({
      perm: "plan.read",
    emailVerified: true,
    blockSuspended: true,
    blockDeleted: true,
    onForbiddenRedirect: "/dashboard",
  });

    const res = await fetch(`${process.env.API_URL}/plans/list`, {
    cache: "no-store",
    headers: {
      // encaminha os cookies da requisição atual pra sua API interna
      cookie: (await headers()).get("cookie") ?? "",
    },
    });

  if (!res.ok) throw new Error("Falha ao buscar os planos");

  const plans = await res.json();



  return <PlansAdminClient initialPlans={plans} />;
}
