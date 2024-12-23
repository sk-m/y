/* eslint-disable solid/reactivity */
import { createEffect, createMemo, createSignal } from "solid-js"

import { IStorageEntry } from "../storage-entry/storage-entry.codecs"

export const layoutTypes = ["grid", "slates"] as const

export type Layout = (typeof layoutTypes)[number]
export type SortBy = "name" | "mime_type" | "size" | "created_at"
export type SortDirection = "asc" | "desc"

export const FILE_EXPLORER_ENTRY_WIDTH_MIN = 60
export const FILE_EXPLORER_ENTRY_WIDTH_MAX = 280
export const FILE_EXPLORER_ENTRY_WIDTH_DEFAULT = 120

export const FILE_EXPLORER_ENTRY_FONT_SIZE_MIN = 10
export const FILE_EXPLORER_ENTRY_FONT_SIZE_MAX = 14

export const useFileExplorerDisplayConfig = () => {
  const userEntrySize = Number.parseInt(
    localStorage.getItem("y_storage_files_explorer_entry_size") ?? "",
    10
  )

  const userLayout = localStorage.getItem("y_storage_files_explorer_layout")

  const [layout, setLayout] = createSignal<Layout>(
    layoutTypes.includes(userLayout as Layout) ? (userLayout as Layout) : "grid"
  )
  const [sortBy, setSortBy] = createSignal<SortBy>("name")
  const [sortDirection, setSortDirection] = createSignal<SortDirection>("desc")
  const [entrySize, setEntrySize] = createSignal<number>(
    Number.isNaN(userEntrySize)
      ? FILE_EXPLORER_ENTRY_WIDTH_DEFAULT
      : userEntrySize
  )

  createEffect(() => {
    localStorage.setItem(
      "y_storage_files_explorer_entry_size",
      entrySize().toString()
    )
  })

  createEffect(() => {
    localStorage.setItem("y_storage_files_explorer_layout", layout())
  })

  // eslint-disable-next-line sonarjs/cognitive-complexity
  const sortFn = createMemo(() => {
    if (sortBy() === "name") {
      return (a: IStorageEntry, b: IStorageEntry) =>
        a.name.localeCompare(b.name) * (sortDirection() === "desc" ? 1 : -1)
    }

    if (sortBy() === "mime_type") {
      return (a: IStorageEntry, b: IStorageEntry) =>
        (a.mime_type ?? "").localeCompare(b.mime_type ?? "") *
        (sortDirection() === "desc" ? 1 : -1)
    }

    if (sortBy() === "size") {
      return (a: IStorageEntry, b: IStorageEntry) =>
        ((a.size_bytes ?? 0) < (b.size_bytes ?? 0) ? -1 : 1) *
        (sortDirection() === "desc" ? 1 : -1)
    }

    if (sortBy() === "created_at") {
      return (a: IStorageEntry, b: IStorageEntry) =>
        (Date.parse(a.created_at ?? "") < Date.parse(b.created_at ?? "")
          ? -1
          : 1) * (sortDirection() === "desc" ? 1 : -1)
    }

    return () => 0
  })

  return {
    layout,
    setLayout,

    sortBy,
    setSortBy,

    sortDirection,
    setSortDirection,

    entrySize,
    setEntrySize,

    sortFn,
  }
}
