import { z } from "zod";

export const roleCreateSchema = z.object({
  id: z.string(),
  name: z.string().min(2, "Nome muito curto"),
  description: z.string().nullable().optional(),
  isActive: z.boolean().default(true),
});

