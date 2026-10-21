// src/utils/access-core.ts

export type RoleName = string;      // ex.: "Admin"
export type PermissionKey = string; // ex.: "exam.publish"

/** A single key, or a list where any one of the keys is enough. */
export type PermissionRequirement = PermissionKey | readonly PermissionKey[];

export type AuthProfile = {
  emailVerified: boolean;
  status: "active" | "suspended" | "deleted";
  roles: RoleName[];
  perms: PermissionKey[];
};

export function hasRole(profile: AuthProfile, role: RoleName | RoleName[]) {
  if (Array.isArray(role)) {
    // OR: basta ter um
    return role.some((r) => profile.roles.includes(r));
  }
  return profile.roles.includes(role);
}

export function hasPermission(
  profile: AuthProfile,
  perm: PermissionRequirement
) {
  if (typeof perm !== "string") {
    // OR: basta ter uma perm
    return perm.some((p) => profile.perms.includes(p));
  }
  return profile.perms.includes(perm);
}

export function can(
  profile: AuthProfile,
  opts?: {
    role?: RoleName | RoleName[];
    perm?: PermissionRequirement;
    /** Every requirement must hold, e.g. the page's own permission plus the permission of each piece of data it reads. */
    allOf?: readonly PermissionRequirement[];
  }
) {
  if (!opts) return true;

  const roleOk = opts.role ? hasRole(profile, opts.role) : true;
  const permOk = opts.perm ? hasPermission(profile, opts.perm) : true;
  const allOfOk = (opts.allOf ?? []).every((req) => hasPermission(profile, req));

  return roleOk && permOk && allOfOk;
}
