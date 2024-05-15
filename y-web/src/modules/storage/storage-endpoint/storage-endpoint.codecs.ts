import { z } from "zod"

import { TStorageEndpointStatus } from "@/modules/admin/storage/storage-endpoint/storage-endpoint.codecs"

export const TStorageEndpoint = z.object({
  id: z.number(),
  name: z.string(),
  status: TStorageEndpointStatus,
  access_rules_enabled: z.boolean(),
})

export type IStorageEndpoint = z.infer<typeof TStorageEndpoint>

export const TGetStorageEndpoints = z.object({
  endpoints: z.array(TStorageEndpoint),
})
