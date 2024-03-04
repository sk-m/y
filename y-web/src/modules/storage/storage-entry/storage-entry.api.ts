import { del, get, patch, post } from "@/app/core/request"

import {
  IStorageEntry,
  TCreateStorageFolder,
  TGetStorageEntries,
  TGetStorageEntryThumbnails,
  TGetStorageFolderPath,
} from "./storage-entry.codecs"
import { downloadResponseBlob } from "./storage-entry.util"

export const apiStorageFolderPath = "/storage/folder-path" as const
export const apiStorageEntries = "/storage/entries" as const
export const apiStorageMoveEntries = "/storage/move-entries" as const
export const apiStorageRenameEntry = "/storage/rename-entry" as const
export const apiStorageEntryThumbnails = "/storage/entry-thumbnails" as const

// TODO move to POST /folder
export const apiStorageCreateFoler = "/storage/create-folder" as const

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

export type GetStorageFolderPathInput = {
  endpointId: number | string
  folderId?: number | string
}

export const storageFolderPath = async (input: GetStorageFolderPathInput) => {
  // eslint-disable-next-line no-undefined
  if (input.folderId === undefined) return { folder_path: [] }

  const query = new URLSearchParams()

  query.set("endpoint_id", input.endpointId.toString())

  if (input.folderId) {
    query.set("folder_id", input.folderId.toString())
  }

  return get(apiStorageFolderPath, {
    query,
  }).then((data) => TGetStorageFolderPath.parse(data))
}

export type GetStorageEntryThumbnails = {
  endpointId: number | string
  fileIds: number[]
}

export const storageEntryThumbnails = async (
  input: GetStorageEntryThumbnails
) => {
  const query = new URLSearchParams()

  query.set("endpoint_id", input.endpointId.toString())
  query.set("file_ids", input.fileIds.join(","))

  return get(apiStorageEntryThumbnails, {
    query,
  }).then((data) => TGetStorageEntryThumbnails.parse(data))
}

export type CreateStorageFolderInput = {
  endpointId: number
  folderId?: number

  newFolderName: string
}

export const createStorageFolder = async (input: CreateStorageFolderInput) => {
  return post(apiStorageCreateFoler, {
    body: {
      endpoint_id: input.endpointId,
      target_folder: input.folderId,
      new_folder_name: input.newFolderName,
    },
  }).then((data) => TCreateStorageFolder.parse(data))
}

export type MoveStorageEntriesInput = {
  endpointId: number
  fileIds: number[]
  folderIds: number[]
  targetFolderId: number | undefined
}

export const moveStorageEntries = async (input: MoveStorageEntriesInput) => {
  return post(apiStorageMoveEntries, {
    body: {
      endpoint_id: input.endpointId,
      file_ids: input.fileIds,
      folder_ids: input.folderIds,
      target_folder_id: input.targetFolderId,
    },
  })
}

export type RenameStorageEntryInput = {
  endpointId: number
  entryType: IStorageEntry["entry_type"]
  entryId: number
  name: string
}

export const renameStorageEntry = async (input: RenameStorageEntryInput) => {
  return patch(apiStorageRenameEntry, {
    body: {
      endpoint_id: input.endpointId,
      entry_type: input.entryType,
      entry_id: input.entryId,
      name: input.name,
    },
  })
}

export type DeleteStorageEntriesInput = {
  endpointId: number
  folderIds: number[]
  fileIds: number[]
}

export const deleteStorageEntries = async (
  input: DeleteStorageEntriesInput
) => {
  return del(apiStorageEntries, {
    body: {
      endpoint_id: input.endpointId,
      folder_ids: input.folderIds,
      file_ids: input.fileIds,
    },
  })
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
      // eslint-disable-next-line sonarjs/no-duplicate-string
      credentials: "same-origin",
      referrerPolicy: "same-origin",
    }
  ).then(downloadResponseBlob)
}

export type DownloadStorageFilesZipInput = {
  endpointId: number | string
  folderIds: number[]
  fileIds: number[]
}

export const downloadStorageFilesZip = async (
  input: DownloadStorageFilesZipInput
) => {
  return fetch(`/api${apiStorageEntries}/${input.endpointId}/download-zip`, {
    method: "POST",
    mode: "cors",
    credentials: "same-origin",
    referrerPolicy: "same-origin",

    headers: {
      "Content-Type": "application/json",
    },

    body: JSON.stringify({
      folder_ids: input.folderIds,
      file_ids: input.fileIds,
    }),
  }).then(downloadResponseBlob)
}
