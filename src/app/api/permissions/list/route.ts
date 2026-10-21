import { NextResponse } from "next/server";
import { defineRoute } from "@/server/auth/define-route";
import { listPermissions } from "@/server/access-control";

export const GET = defineRoute({ perm: ["perm.read", "perm.manage", "role.manage"] }, async (req) => {
  const { searchParams } = new URL(req.url);

  const rows = await listPermissions({
    onlyActive: searchParams.get("onlyActive") === "true",
    resource: searchParams.get("resource") ?? undefined,
  });

  return NextResponse.json(rows);
});
