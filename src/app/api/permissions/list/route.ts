import { NextResponse } from "next/server";
import { defineRoute } from "@/server/auth/define-route";
import { PERMISSION_READ, listPermissions } from "@/server/access-control";

export const GET = defineRoute({ perm: PERMISSION_READ }, async (req) => {
  const { searchParams } = new URL(req.url);

  const rows = await listPermissions({
    onlyActive: searchParams.get("onlyActive") === "true",
    resource: searchParams.get("resource") ?? undefined,
  });

  return NextResponse.json(rows);
});
