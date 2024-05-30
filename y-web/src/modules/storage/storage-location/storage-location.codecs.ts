import { z } from "zod"

export const TStorageLocation = z.object({
  id: z.number(),
  name: z.string(),
  endpoint_id: z.number(),
  entry_id: z.number(),
})

export type IStorageLocation = z.infer<typeof TStorageLocation>

export const TGetStorageLocations = z.object({
  locations: z.array(TStorageLocation),
})

export const TCreateStorageLocation = z.object({
  id: z.number(),
})
