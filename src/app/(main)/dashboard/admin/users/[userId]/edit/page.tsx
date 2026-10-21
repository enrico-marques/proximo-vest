// app/dashboard/admin/users/[userId]/edit/page.tsx
import { notFound } from "next/navigation";
import { requirePageAuth } from "@/utils/access";
import { getUserForAdmin } from "@/server/users";
import { UserAccessPage } from "./_components/UserAcessPage";

export default async function UserEditAndAccessPage({
  params,
}: {
  params: { userId: string };
}) {
  await requirePageAuth({
    // Same permission the /users/list route enforced when this page fetched it.
    perm: "user.read",
    emailVerified: true,
    blockSuspended: true,
    blockDeleted: true,
    onForbiddenRedirect: "/dashboard",
  });

  const { userId } = await params;

  const user = await getUserForAdmin(userId);
  if (!user) notFound();

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
