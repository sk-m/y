import download from "downloadjs"

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

export type DownloadStorageFileInput = {
  endpointId: number | string
  fileId: number | string
}

export const downloadStorageFile = async (input: DownloadStorageFileInput) => {
  const query = new URLSearchParams()

  query.set("file_id", input.fileId.toString())

  return fetch(
    `/api${apiStorageEntries}/${input.endpointId}/download?${query.toString()}`,
    {
      method: "GET",
      mode: "cors",
      credentials: "same-origin",
      referrerPolicy: "same-origin",
    }
  ).then(async (response) => {
    const blob = await response.blob()
    const contentDispositionHeader = response.headers.get("Content-Disposition")

    if (contentDispositionHeader) {
      const regExpFilename = /filename="(?<filename>.*)"/

      const filename: string | null =
        regExpFilename.exec(contentDispositionHeader)?.groups?.filename ?? null

      if (filename) {
        download(blob, filename)
      }
    } else {
      download(blob)
    }
  })
}
