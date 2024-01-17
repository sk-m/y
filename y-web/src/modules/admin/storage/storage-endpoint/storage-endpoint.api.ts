import { get, patch, post } from "@/app/core/request"

import {
  IStorageEndpointStatus,
  TCreateStorageEndpoint,
  TGetStorageEndpoint,
  TGetStorageEndpoints,
} from "./storage-endpoint.codecs"

export const apiAdminStorageEndpoints = "/admin/storage/endpoints" as const

export type GetStorageEndpointInput = {
  endpointId: number | string
}

export const storageEndpoint = async (input: GetStorageEndpointInput) => {
  return get(`${apiAdminStorageEndpoints}/${input.endpointId}`).then((data) =>
    TGetStorageEndpoint.parse(data)
  )
}

export const storageEndpoints = async () => {
  return get(apiAdminStorageEndpoints).then((data) =>
    TGetStorageEndpoints.parse(data)
  )
}

export type UpdateStorageEndpointInput = {
  endpointId: number

  name?: string
  description?: string
  status?: IStorageEndpointStatus
}

export const updateStorageEndpoint = async (
  input: UpdateStorageEndpointInput
) => {
  return patch(`${apiAdminStorageEndpoints}/${input.endpointId}`, {
    body: {
      name: input.name?.trim(),
      description: input.description?.trim(),
      ...(input.status && { status: input.status }),
    },
  })
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
  return post(apiAdminStorageEndpoints, {
    body: {
      name: input.name.trim(),
      endpoint_type: input.type,
      preserve_file_structure: input.preserveFileStructure,
      base_path: input.basePath.trim(),
      description: input.description?.trim(),
    },
  }).then((data) => TCreateStorageEndpoint.parse(data))
}
