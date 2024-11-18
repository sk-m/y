import { createQuery } from "@tanstack/solid-query"

import { storageUserPins } from "./storage-user-pin.api"

export const storageUserPinsKey = "storage-pins" as const

export const useStorageUserPins = () => {
  return createQuery(
    () => [storageUserPinsKey],
    async () => storageUserPins(),
    {
      refetchOnMount: false,
    }
  )
}
