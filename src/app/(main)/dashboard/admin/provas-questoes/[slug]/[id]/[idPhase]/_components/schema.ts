import { z } from "zod";


export const sectionSchema = z.object({
  total: z.number(),
  page: z.number(),
  pageSize: z.number(),
  items: z.array(
    z.object({
      id: z.number(),
      examPhaseId: z.number(),
      stimulusId: z.number().nullable(),
      numberLabel: z.string(),
      isDiscursive: z.boolean(),
      difficulty: z.string().nullable(),
      status: z.string(),
      sourcePageStart: z.number().nullable(),
      sourcePageEnd: z.number().nullable(),
      createdAt: z.date(),
      updatedAt: z.date(),
    })
  ),
});
