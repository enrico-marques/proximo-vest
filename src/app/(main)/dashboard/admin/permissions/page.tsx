import { DataTable } from "./_components/data-table";
import { SectionCards } from "./_components/section-cards";
import { requirePageAuth } from "@/utils/access";
import { PERMISSION_READ, listPermissions } from "@/server/access-control";

export default async function Page() {
  await requirePageAuth({
    // The page's own permission plus the read permission of every service it calls.
    allOf: [PERMISSION_READ],
    perm: ["perm.read"],
    emailVerified: true,
    blockSuspended: true,
    blockDeleted: true,
    onForbiddenRedirect: "/dashboard", // opcional
  });

  const data = await listPermissions();

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <SectionCards roleNumber={data.length} />
      <DataTable data={data} />
    </div>
  );
}
