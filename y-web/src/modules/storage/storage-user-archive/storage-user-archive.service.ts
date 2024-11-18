import { createQuery } from "@tanstack/solid-query"

import { storageUserArchives } from "./storage-user-archive.api"

export const storageUserArchivesKey = "storage-archives" as const

export const useStorageUserArchives = () => {
  return createQuery(
    () => [storageUserArchivesKey],
    async () => storageUserArchives()
  )
}
