/* eslint-disable solid/reactivity */
import { createMemo, createSignal } from "solid-js"

import { IStorageEntry } from "../storage-entry/storage-entry.codecs"

export type Layout = "grid" | "slates"
export type SortBy = "name" | "mime_type" | "size" | "created_at"
export type SortDirection = "asc" | "desc"

export const useFileExplorerDisplayConfig = () => {
  const [layout, setLayout] = createSignal<Layout>("grid")
  const [sortBy, setSortBy] = createSignal<SortBy>("name")
  const [sortDirection, setSortDirection] = createSignal<SortDirection>("desc")

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

    sortFn,
  }
}
