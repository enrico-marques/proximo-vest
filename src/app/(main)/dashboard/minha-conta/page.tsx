import { prisma } from "@/lib/prisma";
import { requirePageAuth } from "@/utils/access";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Mail, ShieldCheck, User2 } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { SessionsPanel } from "./_components/sessions-panel";

export default async function MinhaContaPage() {
  // Apenas autenticado, sem exigir role específica
  const { session, profile } = await requirePageAuth({
    emailVerified: false,
    blockSuspended: true,
    blockDeleted: true,
    onForbiddenRedirect: "/dashboard",
  });

  const userId = session.user.id as string;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      createdAt: true,
      updatedAt: true,
      status: true,
    },
  });

  if (!user) {
    const { redirect } = await import("next/navigation");
    return redirect("/auth/login");
  }

  const statusLabel =
    user.status === "active"
      ? "Ativa"
      : user.status === "suspended"
        ? "Suspensa"
        : "Deletada";

  const statusVariant =
    user.status === "active"
      ? "default"
      : user.status === "suspended"
        ? "outline"
        : "destructive";

  // Agrupa as permissões por resource
  const groupedPermissions = profile.perms.reduce<Record<string, string[]>>(
    (acc, key) => {
      const [resource, action] = key.split(".");
      const group = resource || "outros";
      if (!acc[group]) acc[group] = [];
      acc[group].push(action || key);
      return acc;
    },
    {}
  );

  const createdAtFormatted = user.createdAt
    ? new Date(user.createdAt).toLocaleString("pt-BR")
    : "-";

  const updatedAtFormatted = user.updatedAt
    ? new Date(user.updatedAt).toLocaleString("pt-BR")
    : "-";

  // Avatar fallback: inicial do nome ou do e-mail
  const avatarInitial = (
    user.name?.trim().charAt(0) ||
    user.email?.trim().charAt(0) ||
    "?"
  ).toUpperCase();

  return (
    <div className="flex flex-col gap-6">
      {/* Cabeçalho com avatar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Avatar className="h-12 w-12">
            {/* Se tiver foto futuramente, é só colocar <AvatarImage src={...} /> */}
            <AvatarFallback className="text-base font-semibold">
              {avatarInitial}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
              Minha conta
              <Badge variant={statusVariant}>{statusLabel}</Badge>
            </h1>
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <Mail className="h-4 w-4" />
              {user.email}
            </p>
          </div>
        </div>

        {/* Ações rápidas (por enquanto só alterar senha) */}
        <div className="flex gap-2">
          <Button variant="outline" size="sm" asChild>
            <a href="/auth/change-password">Alterar senha</a>
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[2fr,1.2fr]">
        {/* Coluna principal */}
        <div className="space-y-6">
          {/* Dados básicos */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <User2 className="h-5 w-5" />
                  Dados da conta
                </CardTitle>
                <CardDescription>
                  Informações principais do seu usuário.
                </CardDescription>
              </div>
              <Badge variant={statusVariant}>{statusLabel}</Badge>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase">
                    Nome
                  </p>
                  <p className="text-sm">{user.name ?? "—"}</p>
                </div>
                
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase">
                    E-mail
                  </p>
                  <p className="text-sm flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    {user.email}
                  </p>
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase">
                    Status do e-mail
                  </p>
                  <p className="text-sm flex items-center gap-2">
                    {profile.emailVerified ? (
                      <>
                        <ShieldCheck className="h-4 w-4 text-emerald-500" />
                        <span className="text-emerald-600 text-xs font-medium">
                          E-mail verificado
                        </span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">
                          E-mail ainda não verificado
                        </span>
                      </>
                    )}
                  </p>
                </div>

                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase">
                    Status da conta
                  </p>
                  <p className="text-sm">
                    <Badge variant={statusVariant}>{statusLabel}</Badge>
                  </p>
                </div>
              </div>

              <Separator />

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase">
                    Criada em
                  </p>
                  <p className="text-sm">{createdAtFormatted}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase">
                    Última atualização
                  </p>
                  <p className="text-sm">{updatedAtFormatted}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Roles */}
          <Card>
            <CardHeader>
              <CardTitle>Funções (roles)</CardTitle>
              <CardDescription>
                As roles determinam grupos de permissões que você herda
                automaticamente.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {profile.roles.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Nenhuma role atribuída.
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {profile.roles.map((role) => (
                    <Badge key={role} variant="outline">
                      {role}
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Coluna lateral: segurança e permissões */}
        <div className="space-y-6">
          {/* Segurança rápida */}
          <Card>
            <CardHeader>
              <CardTitle>Segurança</CardTitle>
              <CardDescription>
                Informações gerais sobre o status de segurança da sua conta.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">E-mail verificado</span>
                <Badge variant={profile.emailVerified ? "default" : "outline"}>
                  {profile.emailVerified ? "Sim" : "Não"}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Status da conta</span>
                <Badge variant={statusVariant}>{statusLabel}</Badge>
              </div>

              <Separator className="my-2" />

              <Button variant="outline" size="sm" className="w-full" asChild>
                <a href="/auth/change-password">Alterar senha</a>
              </Button>
            </CardContent>
          </Card>
          <div className="space-y-6">
            <SessionsPanel />
          </div>
          {/* Permissões efetivas */}
          <Card className="max-h-[480px] overflow-hidden flex flex-col">
            <CardHeader>
              <CardTitle>Permissões efetivas</CardTitle>
              <CardDescription className="text-xs">
                Lista de permissões (roles + diretas) atualmente válidas para
                sua conta.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 overflow-auto pr-1">
              {profile.perms.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Nenhuma permissão aplicada a esta conta.
                </p>
              ) : (
                Object.entries(groupedPermissions).map(
                  ([resource, actions]) => (
                    <div key={resource} className="space-y-1">
                      <p className="text-xs font-semibold uppercase text-muted-foreground">
                        {resource}
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {actions.sort().map((action) => (
                          <Badge
                            key={`${resource}.${action}`}
                            variant="outline"
                            className="text-[11px] font-normal"
                          >
                            {resource}.{action}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )
                )
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
