// app/dashboard/admin/users/[userId]/edit/page.tsx
import { requirePageAuth } from "@/utils/access";
import { UserAccessPage } from "./_components/UserAcessPage";
import { headers } from "next/headers";

type ApiUser = {
  id: string;
  name: string | null;
  email: string;
  // tem mais coisas na rota, mas pra cá só precisamos desses
};

export default async function UserEditAndAccessPage({
  params,
}: {
  params: { userId: string };
}) {
  await requirePageAuth({
    //perm: ["user.update", "user.delete", "user.access.update"],
    emailVerified: true,
    blockSuspended: true,
    blockDeleted: true,
    onForbiddenRedirect: "/dashboard",
  });

  const { userId } = await params;
  const headersList = headers();

  // usa a rota que você mandou: GET /api/admin/users?filter=<userId>
  const res = await fetch(`${process.env.API_URL}/users/list?id=${userId}`, {
    cache: "no-store",
    headers: {
      // encaminha os cookies da requisição atual pra sua API interna
      cookie: (await headersList).get("cookie") ?? "",
    },
  });

  if (!res.ok) {
    // se der erro na API, trata aqui
    return (
      <div className="p-4 text-sm text-destructive">
        Erro ao carregar dados do usuário.
      </div>
    );
  }

  const users: ApiUser[] = await res.json();
  const user = users[0];

  if (!user) {
    return <div className="p-4">Usuário não encontrado.</div>;
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">Editar usuário e acessos</h1>
        <p className="text-xs text-muted-foreground">
          Aqui você pode editar os dados do usuário, as roles e as permissões
          diretas aplicadas a ele.
        </p>
      </div>

      <UserAccessPage
        userId={user.id}
        defaultName={user.name ?? ""}
        defaultEmail={user.email ?? ""}
      />
    </div>
  );
}
