import { DataTable } from "./_components/data-table";
import { SectionCards } from "./_components/section-cards";
import { requirePageAuth } from "@/utils/access";
import { listRoles } from "@/server/access-control";

export default async function Page() {
  await requirePageAuth({
    perm: ["role.read"],
    emailVerified: true,
    blockSuspended: true,
    blockDeleted: true,
    onForbiddenRedirect: "/dashboard", // opcional
  });

  const data = await listRoles();

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <SectionCards roleNumber={data.length} />
      <DataTable data={data} />
    </div>
  );
}
