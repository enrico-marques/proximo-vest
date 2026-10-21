import { requirePageAuth } from "@/utils/access";
import { listUsers } from "@/server/users";
import { DataTable } from "./_components/data-table";
import { SectionCards } from "./_components/section-cards";

export default async function Page() {
  await requirePageAuth({
    perm: "user.read",
    emailVerified: true,
    blockSuspended: true,
    blockDeleted: true,
    onForbiddenRedirect: "/dashboard",
  });

  const users = await listUsers();

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <SectionCards userNumber={users.length} />
      <DataTable data={users} />
    </div>
  );
}
