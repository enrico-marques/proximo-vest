import Link from "next/link";
import { redirect } from "next/navigation";
import { BookOpenCheck, ClipboardList, CreditCard, UserRound, type LucideIcon } from "lucide-react";

import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getAuthProfile, getSessionOrNull } from "@/utils/access";
import { can, type AuthProfile, type PermissionKey } from "@/utils/access-core";

export const metadata = { title: "Início | Próximo Vest" };

type Shortcut = {
  href: string;
  title: string;
  description: string;
  icon: LucideIcon;
  perm?: PermissionKey;
};

// Only areas that already exist; student practice and statistics arrive in phase 1.
const SHORTCUTS: Shortcut[] = [
  {
    href: "/dashboard/professor/listas",
    title: "Listas de exercícios",
    description: "Monte listas com questões do banco e gere o PDF.",
    icon: ClipboardList,
    perm: "teacherList.manage",
  },
  {
    href: "/dashboard/admin/provas-questoes",
    title: "Provas e questões",
    description: "Cadastre e revise o banco de questões.",
    icon: BookOpenCheck,
    perm: "examBoard.manage",
  },
  {
    href: "/dashboard/minha-conta",
    title: "Minha conta",
    description: "Dados de acesso e sessões ativas.",
    icon: UserRound,
  },
  {
    href: "/dashboard/assinatura",
    title: "Assinatura",
    description: "Seu plano atual e opções de assinatura.",
    icon: CreditCard,
  },
];

function visibleShortcuts(profile: AuthProfile) {
  return SHORTCUTS.filter((s) => !s.perm || can(profile, { perm: s.perm }));
}

export default async function DashboardPage() {
  // The layout already enforced access; these calls reuse its per-request lookups.
  const session = await getSessionOrNull();
  const profile = session ? await getAuthProfile(session.user.id) : null;
  if (!session || !profile) redirect("/auth/login");

  const firstName = session.user.name.split(" ")[0];

  return (
    <div className="flex flex-col gap-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Olá, {firstName}!</h1>
        <p className="text-muted-foreground text-sm">
          Seu painel com desempenho e estatísticas está em construção e chega em breve.
        </p>
      </header>

      <section aria-labelledby="atalhos" className="space-y-3">
        <h2 id="atalhos" className="text-sm font-medium">
          O que você já pode fazer
        </h2>
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {visibleShortcuts(profile).map(({ href, title, description, icon: Icon }) => (
            <li key={href}>
              <Link href={href} className="block h-full rounded-xl focus-visible:outline-2">
                <Card className="hover:bg-muted/50 h-full transition-colors">
                  <CardHeader>
                    <Icon className="text-muted-foreground size-5" aria-hidden />
                    <CardTitle className="text-base">{title}</CardTitle>
                    <CardDescription>{description}</CardDescription>
                  </CardHeader>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
