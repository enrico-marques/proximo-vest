// app/dashboard/admin/users/[userId]/edit/_components/UserAccessPage.tsx
"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { TransferList, type TransferItem } from "./TransferList";

// ⬇️ importa o Select do shadcn (ajusta o caminho se precisar)
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { errorMessage } from "@/lib/api-error";

type UserStatus = "ACTIVE" | "SUSPENDED" | "DELETED"; // ajuste se seu enum for diferente

type AccessResponse = {
  user: {
    id: string;
    name: string | null;
    email: string;
    status: UserStatus;
  };
  roles: TransferItem[];
  userRoleIds: string[];
  permissions: TransferItem[];
  userPermissionIds: string[];
};

type Props = {
  userId: string;
  defaultName: string;
  defaultEmail: string;
};

export function UserAccessPage({ userId, defaultName, defaultEmail }: Props) {
  const [loading, setLoading] = useState(true);
  const [savingUser, setSavingUser] = useState(false);
  const [savingRoles, setSavingRoles] = useState(false);
  const [savingPermissions, setSavingPermissions] = useState(false);

  const [name, setName] = useState(defaultName);
  const [email, setEmail] = useState(defaultEmail);
  const [status, setStatus] = useState<UserStatus>("ACTIVE");

  const [roles, setRoles] = useState<TransferItem[]>([]);
  const [roleIds, setRoleIds] = useState<string[]>([]);

  const [permissions, setPermissions] = useState<TransferItem[]>([]);
  const [permissionIds, setPermissionIds] = useState<string[]>([]);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/users/${userId}/access`);
        if (!res.ok) throw new Error("Erro ao carregar acessos");

        const data: AccessResponse = await res.json();

        setName(data.user.name ?? "");
        setEmail(data.user.email);
        setStatus(data.user.status);
        setRoles(data.roles);
        setRoleIds(data.userRoleIds);
        setPermissions(data.permissions);
        setPermissionIds(data.userPermissionIds);
      } catch (err) {
        console.error(err);
        toast.error(errorMessage(err) ?? "Erro ao carregar dados do usuário");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [userId]);

  async function handleSaveUser() {
    try {
      setSavingUser(true);
      const res = await fetch(`/api/users/${userId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, status }),
      });

      if (!res.ok) throw new Error("Erro ao salvar dados do usuário");

      toast.success("Dados do usuário atualizados com sucesso");
    } catch (err) {
      console.error(err);
      toast.error(errorMessage(err) ?? "Erro ao salvar dados do usuário");
    } finally {
      setSavingUser(false);
    }
  }

  async function handleSaveRoles(nextRoleIds: string[]) {
    try {
      setSavingRoles(true);
      const res = await fetch(`/api/users/${userId}/roles`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roleIds: nextRoleIds }),
      });

      if (!res.ok) throw new Error("Erro ao salvar roles");

      setRoleIds(nextRoleIds);
      toast.success("Roles atualizadas com sucesso");
    } catch (err) {
      console.error(err);
      toast.error(errorMessage(err) ?? "Erro ao salvar roles");
    } finally {
      setSavingRoles(false);
    }
  }

  async function handleSavePermissions(nextPermissionIds: string[]) {
    try {
      setSavingPermissions(true);
      const res = await fetch(`/api/users/${userId}/permissions`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ permissionIds: nextPermissionIds }),
      });

      if (!res.ok) throw new Error("Erro ao salvar permissões");

      setPermissionIds(nextPermissionIds);
      toast.success("Permissões atualizadas com sucesso");

    } catch (err) {
      console.error(err);
      toast.error(errorMessage(err) ?? "Erro ao salvar permissões");
    } finally {
      setSavingPermissions(false);
    }
  }

  if (loading) {
    return (
      <div className="p-4 text-sm text-muted-foreground">Carregando...</div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* DADOS BÁSICOS */}
      <Card>
        <CardHeader>
          <CardTitle>Dados do usuário</CardTitle>
          <CardDescription>
            Edite as informações principais do usuário.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-1">
              <label className="text-xs font-medium">Nome</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium">E-mail</label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium">Status</label>
              <Select
                value={status}
                onValueChange={(value) => setStatus(value as UserStatus)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecione o status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIVE">Ativo</SelectItem>
                  <SelectItem value="SUSPENDED">Suspenso</SelectItem>
                  <SelectItem value="DELETED">Deletado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={handleSaveUser} disabled={savingUser}>
              {savingUser ? "Salvando..." : "Salvar dados"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* ROLES */}
      <Card>
        <CardHeader>
          <CardTitle>Roles do usuário</CardTitle>
          <CardDescription>
            Gerencie as roles atribuídas ao usuário.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TransferList
            titleLeft="Roles disponíveis"
            titleRight="Roles do usuário"
            items={roles}
            value={roleIds}
            onChange={handleSaveRoles}
            loading={savingRoles}
          />
        </CardContent>
      </Card>

      {/* PERMISSIONS */}
      <Card>
        <CardHeader>
          <CardTitle>Permissões diretas</CardTitle>
          <CardDescription>
            Essas permissões são aplicadas diretamente ao usuário, além das
            permissões herdadas pelas roles.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TransferList
            titleLeft="Permissões disponíveis"
            titleRight="Permissões do usuário"
            items={permissions}
            value={permissionIds}
            onChange={handleSavePermissions}
            loading={savingPermissions}
          />
        </CardContent>
      </Card>
    </div>
  );
}
