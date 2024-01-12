import { get, post } from "@/app/core/request"

import {
  TCreateStorageEndpoint,
  TGetStorageEndpoints,
} from "./storage-endpoint.codecs"

export const apiStorageEndpoints = "/admin/storage/endpoints" as const

export const storageEndpoints = async () => {
  return get(apiStorageEndpoints).then((data) =>
    TGetStorageEndpoints.parse(data)
  )
}

export type CreateStorageEndpointInput = {
  name: string
  type: string
  preserveFileStructure: boolean
  basePath: string
  description?: string
}

export const createStorageEndpoint = async (
  input: CreateStorageEndpointInput
) => {
  return post(apiStorageEndpoints, {
    body: {
      name: input.name.trim(),
      endpoint_type: input.type,
      preserve_file_structure: input.preserveFileStructure,
      base_path: input.basePath.trim(),
      description: input.description?.trim(),
    },
  }).then((data) => TCreateStorageEndpoint.parse(data))
}
