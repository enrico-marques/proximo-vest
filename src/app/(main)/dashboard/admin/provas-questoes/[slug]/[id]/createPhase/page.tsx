import { FormCreateEdition } from "./_components/formCreateEdition";
import { requirePageAuth } from "@/utils/access";
import { headers } from "next/headers";

interface PageProps {
  params: { slug: string; id: string };
}

export default async function Provas({ params }: PageProps) {
  await requirePageAuth({
    perm: ["examPhase.manage"],
    emailVerified: true,
    blockSuspended: true,
    blockDeleted: true,
    onForbiddenRedirect: "/dashboard", // opcional
  });

  const { slug, id } = await params;
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
        Aqui você criará as fases (1° e 2° fase) ou os dias (D1 e D2) de uma
        edição de prova de um determinado ano
      </p>

      <FormCreateEdition id={Number(id)} slug={slug} />
    </div>
  );
}
