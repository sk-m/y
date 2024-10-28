import { createQuery } from "@tanstack/solid-query"

import { ServiceOptions } from "@/app/core/utils"

import {
  GetStorageEndpointInput,
  storageEndpoint,
  storageEndpoints,
} from "./storage-endpoint.api"

export const adminStorageEndpointsKey = "admin-storage-endpoints" as const

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
