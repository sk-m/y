import { createQuery } from "@tanstack/solid-query"

import { storageLocations } from "./storage-location.api"

export const storageLocationsKey = "storage-locations" as const

export const useStorageLocations = () => {
  return createQuery(
    () => [storageLocationsKey],
    async () => storageLocations(),
    {
      refetchOnMount: false,
    }
  )
}
