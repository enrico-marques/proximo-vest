import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { requirePageAuth } from "@/utils/access";
import { ChartAreaInteractive } from "./_components/chart-area-interactive";
import { DataTable } from "./_components/data-table";
import data from "./_components/data.json";
import { SectionCards } from "./_components/section-cards";

export default async function Page() {
  await requirePageAuth({
    perm: "user.read",
    emailVerified: true,
    blockSuspended: true,
    blockDeleted: true,
    onForbiddenRedirect: "/dashboard",
  });

  const headersList = headers();

  const res = await fetch(`${process.env.API_URL}/users/list`, {
    cache: "no-store",
    headers: {
      // encaminha os cookies da requisição atual pra sua API interna
      cookie: (await headersList).get("cookie") ?? "",
    },
  });

  if (!res.ok) {
    const text = await res.text();
    console.error("ERRO /users/list:", res.status, text);
    throw new Error(`Falha ao buscar usuários: ${text}`);
  }

  const boards = await res.json();
  const boardNumber = boards.length as number;

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <SectionCards userNumber={boardNumber} />
      <DataTable data={boards} />
    </div>
  );
}
