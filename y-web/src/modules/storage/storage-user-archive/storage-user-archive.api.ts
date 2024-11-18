import { get } from "@/app/core/request"

import { downloadFileURL } from "../storage-entry/storage-entry.util"
import { TGetStorageUserArchives } from "./storage-user-archive.codecs"

export const apiStorageUserArchives = "/storage/user-archives" as const

export const storageUserArchives = async () => {
  return get(apiStorageUserArchives).then((data) =>
    TGetStorageUserArchives.parse(data)
  )
}

export type DownloadStorageUserArchiveInput = {
  archiveId: number | string
  fileName: string
}

export const downloadStorageUserArchive = (
  input: DownloadStorageUserArchiveInput
) => {
  downloadFileURL(
    `/api${apiStorageUserArchives}/${input.archiveId}/download`,
    input.fileName
  )
}
