import { z } from "zod"

export const TStorageUserArchive = z.object({
  id: z.number(),
  endpoint_id: z.number(),
  target_entries_ids: z.array(z.number()),

  ready: z.boolean(),
  size_bytes: z.number().nullable(),

  created_at: z
    .string()
    .refine((x) => x && !Number.isNaN(Date.parse(x)))
    .nullable(),
})

export type IStorageUserArchive = z.infer<typeof TStorageUserArchive>

export const TGetStorageUserArchives = z.object({
  user_archives: z.array(TStorageUserArchive),
})
