import { DataTable } from "./_components/data-table";
import { SectionCards } from "./_components/section-cards";
import { headers } from "next/headers";
import { requirePageAuth } from "@/utils/access";

export default async function Page() {
  await requirePageAuth({
    perm: ["role.read"],
    emailVerified: true,
    blockSuspended: true,
    blockDeleted: true,
    onForbiddenRedirect: "/dashboard", // opcional
  });

  const headersList = headers();
  const res = await fetch(`${process.env.API_URL}/roles/list`, {
    cache: "no-store",
    headers: {
      // encaminha os cookies da requisição atual pra sua API interna
      cookie: (await headersList).get("cookie") ?? "",
    },
  });

  if (!res.ok) throw new Error("Falha ao buscar boards");

  const data = await res.json();
  const roleNumber = data.length as number;

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <SectionCards roleNumber={roleNumber} />
      <DataTable data={data} />
    </div>
  );
}
