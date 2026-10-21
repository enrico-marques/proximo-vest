import { DataTable } from "./_components/data-table";
import { SectionCards } from "./_components/section-cards";
import { requirePageAuth } from "@/utils/access";
import { listExamBoards } from "@/server/exams";

export default async function Provas() {
  await requirePageAuth({
    perm: ["examBoard.manage"],
    emailVerified: true,
    blockSuspended: true,
    blockDeleted: true,
    onForbiddenRedirect: "/dashboard", // opcional
  });

  const boards = await listExamBoards();

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <SectionCards editionNumber={boards.length} />
      <DataTable data={boards} />
    </div>
  );
}
