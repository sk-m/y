import { createQuery } from "@tanstack/solid-query"

import { ServiceOptions } from "@/app/core/utils"

import {
  GetStorageEndpointInput,
  GetStorageEndpointVFSConfigInput,
  storageEndpoint,
  storageEndpointVFSConfig,
  storageEndpoints,
} from "./storage-endpoint.api"

export const adminStorageEndpointsKey = "admin-storage-endpoints" as const
export const adminStorageEndpointsVFSConfigKey =
  "admin-storage-endpoints-vfs-config" as const

export const useStorageEndpoint = (
  input: () => GetStorageEndpointInput,
  options?: ServiceOptions
) => {
  return createQuery(
    () => [adminStorageEndpointsKey, input()],
    async () => storageEndpoint(input()),
    options
  )
}

export const useStorageEndpointVFSConfig = (
  input: () => GetStorageEndpointVFSConfigInput,
  options?: ServiceOptions
) => {
  return createQuery(
    () => [adminStorageEndpointsVFSConfigKey, input()],
    async () => storageEndpointVFSConfig(input()),
    options
  )
}

export const useStorageEndpoints = (
  _input: () => Record<string, never>,
  options?: ServiceOptions
) => {
  return createQuery(
    () => [adminStorageEndpointsKey],
    async () => storageEndpoints(),
    options
  )
}
