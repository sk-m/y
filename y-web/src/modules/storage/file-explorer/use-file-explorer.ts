/* eslint-disable no-undefined */
import { batch, createMemo, createSignal } from "solid-js"

import { useQueryClient } from "@tanstack/solid-query"

import { IStorageEntry } from "../storage-entry/storage-entry.codecs"
import {
  storageEntriesKey,
  useStorageEntries,
  useStorageFolderPath,
} from "../storage-entry/storage-entry.service"

export type UseFileExplorerProps = {
  endpointId: () => string
  folderId: () => string | undefined
}

export const useFileExplorer = (props: UseFileExplorerProps) => {
  const queryClient = useQueryClient()

  const $folderEntries = useStorageEntries(() => ({
    folderId: props.folderId(),
    endpointId: props.endpointId(),
  }))

  const folderEntries = createMemo(() => $folderEntries.data?.entries ?? [])

  const $folderPath = useStorageFolderPath(() => ({
    folderId: props.folderId(),
    endpointId: props.endpointId(),
  }))

  const folderPath = createMemo(() => $folderPath.data?.folder_path ?? [])

  const [selectedEntries, setSelectedEntries] = createSignal<Set<number>>(
    new Set(),
    {
      equals: false,
    }
  )

  const [lastSelectedEntryIndex, setLastSelectedEntryIndex] = createSignal<
    number | null
  >(null)

  const [temporarySelectedEntry, setTemporarySelectedEntry] =
    createSignal<IStorageEntry | null>(null)

  const temporarySelectedEntryIsInMultiselect = createMemo(
    () =>
      temporarySelectedEntry() !== null &&
      selectedEntries().has(temporarySelectedEntry()!.id)
  )

  const invalidateEntries = async () => {
    setLastSelectedEntryIndex(null)

    return queryClient.invalidateQueries([
      storageEntriesKey,
      props.endpointId(),
      props.folderId(),
    ])
  }

  const selectRange = (firstEntryIndex: number, lastEntryIndex: number) => {
    const entryIdsToSelect: number[] = []

    const entries = folderEntries()

    for (let index = firstEntryIndex; index <= lastEntryIndex; index++) {
      if (entries[index] !== undefined) {
        entryIdsToSelect.push(entries[index]!.id)
      }
    }

    const firstEntryId = entryIdsToSelect[0]
    // eslint-disable-next-line unicorn/prefer-at
    const lastEntryId = entryIdsToSelect[entryIdsToSelect.length - 1]

    if (firstEntryId === undefined || lastEntryId === undefined) return

    batch(() => {
      setLastSelectedEntryIndex(lastEntryIndex)
      setSelectedEntries((currentEntries) => {
        for (const entry of entryIdsToSelect) {
          currentEntries.add(entry)
        }

        return currentEntries
      })
    })
  }

  const selectEntry = (entryIndex: number) => {
    const entryId = folderEntries()[entryIndex]?.id

    if (entryId === undefined) return

    batch(() => {
      setLastSelectedEntryIndex(entryIndex)

      setSelectedEntries((entries) => {
        if (entries.has(entryId)) {
          entries.delete(entryId)
        } else {
          entries.add(entryId)
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
    temporarySelectedEntryIsInMultiselect,
    setTemporarySelectedEntry,
    setSelectedEntries,
    temporarySelectedEntry,
  }
}
