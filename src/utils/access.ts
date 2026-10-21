import { cache } from "react";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

import { type AuthProfile, type PermissionKey, type PermissionRequirement, type RoleName, can } from "./access-core";

// ============================================================================
// SESSÃO (Server only)
// ============================================================================

// Memoized per request: the dashboard layout and its page both need the session and profile,
// and every lookup is a billed database operation.
export const getSessionOrNull = cache(async () => {
  const hdrs = Object.fromEntries((await headers()).entries());
  return auth.api.getSession({ headers: hdrs });
});

// ============================================================================
// CARREGA PERFIL DE AUTORIZAÇÃO (Server only)
// ============================================================================

export const getAuthProfile = cache(async (
  userId: string
): Promise<AuthProfile | null> => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      emailVerified: true,
      status: true,
      roles: {
        select: {
          role: {
            select: {
              name: true,
              isActive: true,
              perms: {
                select: {
                  granted: true,
                  permission: { select: { key: true, isActive: true } },
                },
              },
            },
          },
        },
      },
      directPerms: {
        select: {
          granted: true,
          permission: { select: { key: true, isActive: true } },
        },
      },
    },
  });

  if (!user) return null;

  // ----- ROLES -----
  const roleNames = (user.roles ?? [])
    .filter((r) => r.role?.isActive)
    .map((r) => r.role!.name);

  // ----- PERMISSÕES VIA ROLE -----
  const fromRoles: Record<PermissionKey, boolean> = {};

  for (const ur of user.roles ?? []) {
    if (!ur.role?.isActive) continue;

    for (const rp of ur.role.perms ?? []) {
      if (!rp.permission?.isActive) continue;
      fromRoles[rp.permission.key] = rp.granted;
    }
  }

  // ----- PERMISSÕES DIRETAS (override) -----
  const direct: Record<PermissionKey, boolean> = {};

  for (const up of user.directPerms ?? []) {
    if (!up.permission?.isActive) continue;
    direct[up.permission.key] = up.granted;
  }

  // ----- MERGE FINAL -----
  const merged = { ...fromRoles, ...direct };

  const permsArray = Object.entries(merged)
    .filter(([, granted]) => granted)
    .map(([key]) => key);

  return {
    emailVerified: user.emailVerified,
    status: user.status as "active" | "suspended" | "deleted",
    roles: roleNames,
    perms: permsArray,
  };
});

// ============================================================================
// REQUIRE PAGE AUTH (Server only)
// ============================================================================

// ============================================================================
// REQUIRE PAGE AUTH (Server only) – versão com Assinatura + Limites
// ============================================================================
export async function requirePageAuth(opts?: {
  role?: RoleName | RoleName[];
  perm?: PermissionRequirement;
  /** Extra requirements that must all hold; pass the read permission of each service the page calls. */
  allOf?: readonly PermissionRequirement[];
  emailVerified?: boolean;
  blockSuspended?: boolean;
  blockDeleted?: boolean;

  onUnauthorizedRedirect?: string;
  onUnverifiedRedirect?: string;
  onSuspendedRedirect?: string;
  onDeletedRedirect?: string;
  onForbiddenRedirect?: string;
}) {
  const {
    onUnauthorizedRedirect = "/auth/login",
    onUnverifiedRedirect = "/verify-email",
    onSuspendedRedirect = "/suspended",
    onDeletedRedirect = "/deleted",
    onForbiddenRedirect = "/dashboard",
  } = opts ?? {};

  const session = await getSessionOrNull();
  const { redirect } = await import("next/navigation");

  if (!session?.user?.id) {
    return redirect(onUnauthorizedRedirect);
  }

  const profile = await getAuthProfile(session.user.id as string);
  if (!profile) {
    return redirect(onUnauthorizedRedirect);
  }

  const blockSuspended = opts?.blockSuspended ?? true;
  const blockDeleted = opts?.blockDeleted ?? true;

  if (blockDeleted && profile.status === "deleted") {
    return redirect(onDeletedRedirect);
  }

  if (blockSuspended && profile.status === "suspended") {
    return redirect(onSuspendedRedirect);
  }

  if (opts?.emailVerified && !profile.emailVerified) {
    return redirect(onUnverifiedRedirect);
  }

  if (!can(profile, { role: opts?.role, perm: opts?.perm, allOf: opts?.allOf })) {
    return redirect(onForbiddenRedirect);
  }

  return { session, profile };
}