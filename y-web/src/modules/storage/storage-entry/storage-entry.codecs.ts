/* eslint-disable no-warning-comments */
import { z } from "zod"

export const TUploadEntries = z.object({
  error: z
    .object({
      code: z.string(),
    })
    .optional(),
  skipped_files: z.array(z.string()).optional(),
})

// TODO: Consider removing parent_folder.
// I'm not sure it's actually really necessary for us to know that.
export const TStorageEntry = z.object({
  id: z.number(),

  /**
   * When null, this entry resides in the root.
   *  */
  parent_folder: z.number().nullable(),
  name: z.string(),
  extension: z.string().nullable(),
  entry_type: z.enum(["file", "folder"]),
})

export type IStorageEntry = z.infer<typeof TStorageEntry>

export const TGetStorageEntries = z.object({
  entries: z.array(TStorageEntry),
})

export const TGetStorageEntryThumbnails = z.object({
  thumbnails: z.record(z.string()),
})

export const TCreateStorageFolder = z.object({
  new_folder_id: z.number(),
})

export const TGetStorageFolderPath = z.object({
  folder_path: z.array(
    z.object({
      id: z.number(),
      name: z.string(),
      parent_folder: z.number().nullable(),
    })
  ),
})
