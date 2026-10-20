// app/(dashboard)/roles/[roleId]/permissions/_components/RolePermissionsForm.tsx
"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { errorMessage } from "@/lib/api-error";

type Permission = {
  id: string;
  resource: string;
  action: string;
  key: string;
  isActive: boolean;
};

type RolePermissionResponse = {
  role: {
    id: string;
    name: string;
    description: string | null;
    isActive: boolean;
  };
  permissions: {
    roleId: string;
    permissionId: string;
    granted: boolean;
    permission: Permission;
  }[];
};

export function RolePermissionsForm({ roleId }: { roleId: string }) {
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);

        const [permsRes, rolePermsRes] = await Promise.all([
          fetch("/api/permissions/list?onlyActive=true"),
          fetch(`/api/roles/${roleId}/permissions`),
        ]);

        const permsJson: Permission[] = await permsRes.json();
        const rolePermsJson: RolePermissionResponse = await rolePermsRes.json();

        setPermissions(permsJson);

        const grantedIds =
          rolePermsJson.permissions
            ?.filter((rp) => rp.granted)
            .map((rp) => rp.permissionId) ?? [];

        setSelectedIds(grantedIds);
      } catch (e) {
        console.error(e);
        toast.error("Erro ao carregar permissões.");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [roleId]);

  const togglePermission = (id: string) => {
    setSelectedIds((current) =>
      current.includes(id)
        ? current.filter((x) => x !== id)
        : [...current, id]
    );
  };

  const grouped = permissions.reduce<Record<string, Permission[]>>(
    (acc, perm) => {
      const group = perm.resource || "Outros";
      if (!acc[group]) acc[group] = [];
      acc[group].push(perm);
      return acc;
    },
    {}
  );

  async function handleSave() {
    try {
      setSaving(true);

      const res = await fetch(`/api/roles/${roleId}/permissions`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ permissionIds: selectedIds }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message || "Erro ao salvar.");

      toast.success("Permissões atualizadas com sucesso!");
    } catch (e) {
      console.error(e);
      toast.error(errorMessage(e) || "Erro ao salvar permissões.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground">Carregando permissões...</p>;
  }

  if (!permissions.length) {
    return <p className="text-sm text-muted-foreground">Nenhuma permissão cadastrada.</p>;
  }

  return (
    <div className="space-y-6">
      {Object.entries(grouped).map(([resource, perms]) => (
        <div key={resource} className="border rounded-md p-4 space-y-2">
          <h2 className="font-semibold text-sm uppercase tracking-wide">
            {resource}
          </h2>

          <div className="space-y-2">
            {perms.map((perm) => (
              <label
                key={perm.id}
                className="flex items-start gap-2 text-sm cursor-pointer"
              >
                <Checkbox
                  checked={selectedIds.includes(perm.id)}
                  onCheckedChange={() => togglePermission(perm.id)}
                  className="mt-0.5"
                />
                <div>
                  <div className="font-medium">{perm.key}</div>
                  <div className="text-xs text-muted-foreground">
                    {perm.resource}.{perm.action}
                  </div>
                </div>
              </label>
            ))}
          </div>
        </div>
      ))}

      <Button onClick={handleSave} disabled={saving}>
        {saving ? "Salvando..." : "Salvar alterações"}
      </Button>
    </div>
  );
}
