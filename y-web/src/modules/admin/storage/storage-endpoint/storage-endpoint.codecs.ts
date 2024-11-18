import { z } from "zod"

// Fields
export const storageEndpointStatus = [
  "active",
  "read_only",
  "disabled",
] as const

export const TStorageEndpointType = z.union([
  z.literal("local_fs"),
  z.literal("test"),
])
export type IStorageEndpointType = z.infer<typeof TStorageEndpointType>

export const TStorageEndpointStatus = z.union([
  z.literal("active"),
  z.literal("read_only"),
  z.literal("disabled"),
])
export type IStorageEndpointStatus = z.infer<typeof TStorageEndpointStatus>

// Objects
export const TStorageEndpoint = z.object({
  id: z.number(),
  name: z.string(),
  endpoint_type: TStorageEndpointType,
  status: TStorageEndpointStatus,
  preserve_file_structure: z.boolean(),
  base_path: z.string(),
  artifacts_path: z.nullable(z.string()),
  description: z.nullable(z.string()),
  access_rules_enabled: z.boolean(),
  vfs_enabled: z.boolean().nullable(),
})
export type IStorageEndpoint = z.infer<typeof TStorageEndpoint>

export const TStorageEndpointRow = TStorageEndpoint
export type IStorageEndpointRow = z.infer<typeof TStorageEndpointRow>

export const TStorageEndpointVFSConfig = z.object({
  enabled: z.boolean(),
  writable: z.boolean(),
  mountpoint: z.string(),
})

export type IStorageEndpointVFSConfig = z.infer<
  typeof TStorageEndpointVFSConfig
>

// Requests
export const TGetStorageEndpoints = z.object({
  storage_endpoints: z.array(TStorageEndpointRow),
})

export const TGetStorageEndpoint = TStorageEndpoint

export const TGetStorageEndpointVFSConfig = z.object({
  vfs_config: TStorageEndpointVFSConfig.nullable(),
})

export const TCreateStorageEndpoint = z.object({
  id: z.number(),
})

export const TSetStorageEndpointVFSConfig = TStorageEndpointVFSConfig
