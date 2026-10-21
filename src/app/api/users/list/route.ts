export const runtime = "nodejs"
import { z } from "zod"
import { json } from "../../_utils"
import { defineRoute } from "@/server/auth/define-route";
import { USER_READ, listUsers } from "@/server/users";

const Schema = z.object({
  filter: z.string().optional(),
})

export const GET = defineRoute({ perm: USER_READ }, async (req) => {
  const { searchParams } = new URL(req.url)
  const { filter } = Schema.parse({ filter: searchParams.get("filter") || undefined })

  return json(await listUsers({ filter }))
});
