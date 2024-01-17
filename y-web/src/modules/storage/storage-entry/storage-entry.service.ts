import { createQuery } from "@tanstack/solid-query"

import { GetStorageEntriesInput, storageEntries } from "./storage-entry.api"

export const storageEntriesKey = "storage-entries" as const

export const useStorageEntries = (input: () => GetStorageEntriesInput) => {
  return createQuery(
    () => [storageEntriesKey, input().endpointId, input().folderId],
    async () => storageEntries(input())
  )
}
