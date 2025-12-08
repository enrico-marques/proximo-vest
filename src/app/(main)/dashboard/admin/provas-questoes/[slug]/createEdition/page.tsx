import { FormCreateEdition } from "./_components/formCreateEdition";
import { requirePageAuth } from "@/utils/access";
import { headers } from "next/headers";

interface PageProps {
  params: { slug: string };
}

export default async function Provas({ params }: PageProps) {
  await requirePageAuth({
    perm: ["examEdition.manage"],
    emailVerified: true,
    blockSuspended: true,
    blockDeleted: true,
    onForbiddenRedirect: "/dashboard", // opcional
  });

  const { slug } = await params;
  const res = await fetch(`${process.env.API_URL}/exam-board/slug/${slug}`, {
    cache: "no-store",
    headers: {
      // encaminha os cookies da requisição atual pra sua API interna
      cookie: (await headers()).get("cookie") ?? "",
    },
  });

  const board = await res.json();

  const boardId = board.id as number;
  if (boardId === undefined) {
    return null;
  }

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <h1 className="font-bold text-2xl">
        Criar edição da prova da {board.name}
      </h1>

      <p>
        Aqui você criará as edições de uma prova Exemplo:{" "}
        <code>2025,2024,2023</code>
      </p>

      <FormCreateEdition boardId={boardId} slug={slug} />
    </div>
  );
}
