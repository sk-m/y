import { createQuery } from "@tanstack/solid-query"

import { storageEndpoints } from "./storage-endpoint.api"

export const storageEndpointsKey = "storage-endpoints" as const

export const useStoragetEndpoints = (
  _input: () => Record<string, never>,
  options: {
    refetchOnWindowFocus?: boolean
    refetchInterval?: number
  }
) => {
  return createQuery(
    () => [storageEndpointsKey],
    async () => storageEndpoints(),
    { ...options }
  )
}
