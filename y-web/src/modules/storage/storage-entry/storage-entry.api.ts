import { get } from "@/app/core/request"

import { TGetStorageEntries } from "./storage-entry.codecs"

export const apiStorageEntries = "/storage/entries" as const

export type GetStorageEntriesInput = {
  endpointId: number | string
  folderId?: number | string
}

export const storageEntries = async (input: GetStorageEntriesInput) => {
  const query = new URLSearchParams()

  query.set("endpoint_id", input.endpointId.toString())

  if (input.folderId) {
    query.set("folder_id", input.folderId.toString())
  }

  return get(apiStorageEntries, {
    query,
  }).then((data) => TGetStorageEntries.parse(data))
}
