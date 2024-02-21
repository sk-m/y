import { createQuery } from "@tanstack/solid-query"

import {
  GetStorageEntriesInput,
  GetStorageFolderPathInput,
  storageEntries,
  storageFolderPath,
} from "./storage-entry.api"

export const storageEntriesKey = "storage-entries" as const
export const storageFolderPathKey = "storage-folder-path" as const

export const useStorageEntries = (input: () => GetStorageEntriesInput) => {
  return createQuery(
    () => [storageEntriesKey, input().endpointId, input().folderId],
    async () => storageEntries(input())
  )
}

export const useStorageFolderPath = (
  input: () => GetStorageFolderPathInput
) => {
  return createQuery(
    () => [storageFolderPathKey, input().endpointId, input().folderId],
    async () => storageFolderPath(input())
  )
}
