// src/app/(main)/dashboard/professor/listas/nova/page.tsx
import { Metadata } from "next";
import { TeacherListForm } from "../_components/teacher-list-form";
import { requirePageAuth } from "@/utils/access";

export const metadata: Metadata = {
  title: "Nova lista de professor | Próximo Vest",
};

export default async function NewTeacherListPage() {
  // garante que só usuário autenticado/professor vê isso
  await requirePageAuth({ perm: "teacherList.manage", emailVerified: true });

  return (
    <div className="flex flex-col gap-6">
      <TeacherListForm />
    </div>
  );
}
