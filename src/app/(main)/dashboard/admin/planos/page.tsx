import { listPlans } from "@/server/plans";
import { can } from "@/utils/access-core";
import { requirePageAuth } from "@/utils/access";

import { PlansAdminClient } from "./_components/plans-admin-client";

export default async function PlansAdminPage() {
  const { profile } = await requirePageAuth({
    perm: ["plan.read", "plan.manage"],
    emailVerified: true,
    blockSuspended: true,
    blockDeleted: true,
    onForbiddenRedirect: "/dashboard",
  });

  const plans = await listPlans({ includeInactive: true });

  return <PlansAdminClient plans={plans} canManage={can(profile, { perm: "plan.manage" })} />;
}
