import { NextResponse } from "next/server";
import { z } from "zod";
import { defineRoute } from "@/server/auth/define-route";
import { ROLE_READ, listRoles } from "@/server/access-control";

const Schema = z.object({
  isActive: z.enum(["true", "false"]).optional(),
});

export const GET = defineRoute({ perm: ROLE_READ }, async (req) => {
  const { searchParams } = new URL(req.url);
  const { isActive } = Schema.parse({ isActive: searchParams.get("isActive") ?? undefined });

  const rows = await listRoles({ isActive: isActive === undefined ? undefined : isActive === "true" });

  return NextResponse.json(rows);
});
