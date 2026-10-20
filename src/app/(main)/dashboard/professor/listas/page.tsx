// src/app/(main)/dashboard/professor/listas/page.tsx

import { Metadata } from "next";
import { requirePageAuth } from "@/utils/access";

import { TeacherListsTable } from "./_components/teacher-lists-table";

export const metadata: Metadata = {
  title: "Listas de Professor | Próximo Vest",
};

export default async function TeacherListsPage() {
  await requirePageAuth({ perm: "teacherList.manage", emailVerified: true });

  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Listas de professor
          </h1>
          <p className="text-sm text-muted-foreground">
            Monte e organize folhas de exercícios com questões do banco da plataforma.
          </p>
        </div>
      </header>

      <TeacherListsTable />
    </div>
  );
}
