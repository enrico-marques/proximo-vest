import { z } from "zod";

export const sectionSchema = z.object({

  id: z.number(),
  examBoardId: z.number(),
  year: z.number(),
  editionLabel: z.string().min(1),
  notes: z.string().nullable(),
 
});
