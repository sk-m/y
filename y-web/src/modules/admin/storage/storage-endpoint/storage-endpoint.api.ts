import { get, patch, post, put } from "@/app/core/request"

import {
  IStorageEndpointStatus,
  TCreateStorageEndpoint,
  TGetStorageEndpoint,
  TGetStorageEndpointVFSConfig,
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

export type GetStorageEndpointVFSConfigInput = GetStorageEndpointInput

export const storageEndpointVFSConfig = async (
  input: GetStorageEndpointVFSConfigInput
) => {
  return get(`${apiAdminStorageEndpoints}/${input.endpointId}/vfs`).then(
    (data) => TGetStorageEndpointVFSConfig.parse(data)
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

  // eslint-disable-next-line @typescript-eslint/naming-convention
  access_rules_enabled?: boolean
}

export const updateStorageEndpoint = async (
  input: UpdateStorageEndpointInput
) => {
  return patch(`${apiAdminStorageEndpoints}/${input.endpointId}`, {
    body: {
      name: input.name?.trim(),
      description: input.description?.trim(),
      ...(input.status && { status: input.status }),
      // eslint-disable-next-line no-undefined
      ...(input.access_rules_enabled !== undefined && {
        access_rules_enabled: input.access_rules_enabled,
      }),
    },
  })
}

export type SetStorageEndpointVFSConfigInput = {
  endpointId: number

  enabled: boolean
  writable: boolean
  mountpoint: string
}

export const setStorageEndpointVFSConfig = async (
  input: SetStorageEndpointVFSConfigInput
) => {
  return put(`${apiAdminStorageEndpoints}/${input.endpointId}/vfs`, {
    body: {
      enabled: input.enabled,
      writable: input.writable,
      mountpoint: input.mountpoint,
    },
  })
}

export type CreateStorageEndpointInput = {
  name: string
  type: string
  accessRulesEnabled: boolean
  basePath: string
  artifactsPath: string
  description?: string
}

export const createStorageEndpoint = async (
  input: CreateStorageEndpointInput
) => {
  return post(apiAdminStorageEndpoints, {
    body: {
      name: input.name.trim(),
      endpoint_type: input.type,
      access_rules_enabled: input.accessRulesEnabled,
      base_path: input.basePath.trim(),
      artifacts_path: input.artifactsPath.trim(),
      description: input.description?.trim(),
    },
  }).then((data) => TCreateStorageEndpoint.parse(data))
}
