"use client";

import { can } from "@/utils/access-core";
import { useAuthProfile } from "@/contexts/auth-profile-context";

export function useCan(opts?: { role?: string | string[]; perm?: string | string[] }) {
  const profile = useAuthProfile();

  if (!profile) return false; // se não tiver profile no contexto, ninguém tem permissão
  return can(profile, opts);
}
