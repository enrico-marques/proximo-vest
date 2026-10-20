"use server";

import { cookies } from "next/headers";

// Server actions are public POST endpoints: only UI preference cookies may be touched here,
// never session or auth cookies.
const PREFERENCE_COOKIES = [
  "theme_mode",
  "theme_preset",
  "sidebar_variant",
  "sidebar_collapsible",
  "content_layout",
  "navbar_style",
] as const;

type PreferenceCookie = (typeof PREFERENCE_COOKIES)[number];

function isPreferenceCookie(key: string): key is PreferenceCookie {
  return (PREFERENCE_COOKIES as readonly string[]).includes(key);
}

export async function setValueToCookie(
  key: string,
  value: string,
  options: { path?: string; maxAge?: number } = {},
): Promise<void> {
  if (!isPreferenceCookie(key) || value.length > 64) return;

  const cookieStore = await cookies();
  cookieStore.set(key, value, {
    path: options.path ?? "/",
    maxAge: options.maxAge ?? 60 * 60 * 24 * 7, // default: 7 days
  });
}

export async function getPreference<T extends string>(key: string, allowed: readonly T[], fallback: T): Promise<T> {
  const cookieStore = await cookies();
  const cookie = cookieStore.get(key);
  const value = cookie ? cookie.value.trim() : undefined;
  return allowed.includes(value as T) ? (value as T) : fallback;
}
