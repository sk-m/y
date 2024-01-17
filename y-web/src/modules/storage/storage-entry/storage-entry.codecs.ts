/* eslint-disable no-warning-comments */
import { z } from "zod"

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
