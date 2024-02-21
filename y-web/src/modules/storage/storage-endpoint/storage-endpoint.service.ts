import { createQuery } from "@tanstack/solid-query"

import { storageEndpoints } from "./storage-endpoint.api"

export const storageEndpointsKey = "storage-endpoints" as const

export const useStorageEndpoints = () => {
  return createQuery(
    () => [storageEndpointsKey],
    async () => storageEndpoints(),
    {
      refetchOnMount: false,
    }
  )
}
