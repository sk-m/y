/* eslint-disable no-undefined */
import { batch, createMemo, createSignal } from "solid-js"

import { useQueryClient } from "@tanstack/solid-query"

import { IStorageEntry } from "../storage-entry/storage-entry.codecs"
import {
  storageEntriesKey,
  useStorageEntries,
  useStorageFolderPath,
} from "../storage-entry/storage-entry.service"

export type SelectedEntry = `${IStorageEntry["entry_type"]}:${number}`

export type UseFileExplorerProps = {
  endpointId: () => string
  folderId: () => string | undefined

  entriesSortFn?: () => (a: IStorageEntry, b: IStorageEntry) => number
  entriesFilterFn?: () => (entry: IStorageEntry) => boolean
}

export const useFileExplorer = (props: UseFileExplorerProps) => {
  const queryClient = useQueryClient()

  const $folderEntries = useStorageEntries(() => ({
    folderId: props.folderId(),
    endpointId: props.endpointId(),
  }))

  const folderEntries = createMemo(
    () => {
      const filter = props.entriesFilterFn?.()

      const entries = filter
        ? ($folderEntries.data?.entries ?? []).filter((entry) => filter(entry))
        : $folderEntries.data?.entries ?? []

      return props.entriesSortFn ? entries.sort(props.entriesSortFn()) : entries
    },
    undefined,
    {
      equals: false,
    }
  )

  const $folderPath = useStorageFolderPath(() => ({
    folderId: props.folderId(),
    endpointId: props.endpointId(),
  }))

  const folderPath = createMemo(() => $folderPath.data?.folder_path ?? [])

  const [selectedEntries, setSelectedEntries] = createSignal<
    Set<SelectedEntry>
  >(new Set(), {
    equals: false,
  })

  const [lastSelectedEntryIndex, setLastSelectedEntryIndex] = createSignal<
    number | null
  >(null)

  const [contextMenuTargetEntry, setContextMenuTargetEntry] =
    createSignal<IStorageEntry | null>(null)

  const contextMenuTargetEntryIsInMultiselect = createMemo(
    () =>
      contextMenuTargetEntry() !== null &&
      selectedEntries().has(
        `${contextMenuTargetEntry()!.entry_type}:${
          contextMenuTargetEntry()!.id
        }`
      )
  )

  const invalidateEntries = async () => {
    setLastSelectedEntryIndex(null)

    return queryClient.invalidateQueries([
      storageEntriesKey,
      props.endpointId(),
      props.folderId(),
    ])
  }

  const selectRange = (aIndex: number, bIndex: number) => {
    const firstEntryIndex = Math.min(aIndex, bIndex)
    const lastEntryIndex = Math.max(aIndex, bIndex)

    const entries = folderEntries()
    const entriesToSelect: IStorageEntry[] = []

    for (let index = firstEntryIndex; index <= lastEntryIndex; index++) {
      if (entries[index] !== undefined) {
        entriesToSelect.push(entries[index]!)
      }
    }

    const firstEntryId = entriesToSelect[0]
    // eslint-disable-next-line unicorn/prefer-at
    const lastEntryId = entriesToSelect[entriesToSelect.length - 1]

    if (firstEntryId === undefined || lastEntryId === undefined) return

    batch(() => {
      setLastSelectedEntryIndex(lastEntryIndex)
      setSelectedEntries((currentEntries) => {
        for (const entry of entriesToSelect) {
          currentEntries.add(`${entry.entry_type}:${entry.id}`)
        }

        return currentEntries
      })
    })
  }

  const selectEntry = (entryIndex: number) => {
    const targetEntry = folderEntries()[entryIndex]

    if (targetEntry === undefined) return

    batch(() => {
      setLastSelectedEntryIndex(entryIndex)

      setSelectedEntries((entries) => {
        const targetEntrySignature: SelectedEntry = `${targetEntry.entry_type}:${targetEntry.id}`

        if (entries.has(targetEntrySignature)) {
          entries.delete(targetEntrySignature)
        } else {
          entries.add(targetEntrySignature)
        }

        return entries
      })
    })
  }

  const onSelect = (entryIndex: number, event?: MouseEvent) => {
    if (event) {
      event.stopPropagation()

      if (event.shiftKey && lastSelectedEntryIndex() !== null) {
        selectRange(lastSelectedEntryIndex()!, entryIndex)
        return
      }
    }

    selectEntry(entryIndex)
  }

  const resetSelection = () => {
    setSelectedEntries((entries) => {
      for (const entry of entries) {
        entries.delete(entry)
      }

      return entries
    })
  }

  return {
    folderEntries,
    folderPath,
    invalidateEntries,
    onSelect,
    resetSelection,
    selectedEntries,
    lastSelectedEntryIndex,
    contextMenuTargetEntryIsInMultiselect,
    setContextMenuTargetEntry,
    setSelectedEntries,
    contextMenuTargetEntry,
  }
}
