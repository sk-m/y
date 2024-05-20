/* eslint-disable unicorn/prevent-abbreviations */

/* eslint-disable no-warning-comments */

/* eslint-disable unicorn/consistent-function-scoping */
import {
  Component,
  For,
  Match,
  Show,
  Switch,
  batch,
  createEffect,
  createMemo,
  createSignal,
  on,
  onCleanup,
  onMount,
} from "solid-js"

import { useParams, useSearchParams } from "@solidjs/router"
import { createMutation } from "@tanstack/solid-query"

import { Stack } from "@/app/components/common/stack/stack"
import { Text } from "@/app/components/common/text/text"
import {
  ContextMenu,
  ContextMenuLink,
  ContextMenuSection,
} from "@/app/components/context-menu/context-menu"
import { toastCtl } from "@/app/core/toast"
import { genericErrorToast } from "@/app/core/util/toast-utils"
import { useContextMenu } from "@/app/core/util/use-context-menu"
import { useFilesDrop } from "@/app/core/util/use-files-drop"
import { globalUploadProgressCtl } from "@/app/storage/global-upload-progress"
import { DropFilesHere } from "@/modules/storage/components/drop-files-here"
import {
  SelectedEntry,
  useFileExplorer,
} from "@/modules/storage/file-explorer/use-file-explorer"
import { useFileExplorerThumbnails } from "@/modules/storage/file-explorer/use-file-explorer-thumbnails"
import {
  createStorageFolder,
  deleteStorageEntries,
  downloadStorageFile,
  downloadStorageFilesZip,
  moveStorageEntries,
  renameStorageEntry,
} from "@/modules/storage/storage-entry/storage-entry.api"
import {
  IStorageEntry,
  TUploadEntries,
} from "@/modules/storage/storage-entry/storage-entry.codecs"
import { FileWithPath } from "@/modules/storage/upload"

import { useFileExplorerDisplayConfig } from "../../file-explorer/use-file-explorer-display-config"
import { FileExplorerDeleteModal } from "./components/file-explorer-delete-modal"
import { FileExplorerDisplaySettings } from "./components/file-explorer-display-settings"
import { FileExplorerInfoPanel } from "./components/file-explorer-info-panel"
import { FileExplorerMediaViewer } from "./components/file-explorer-media-viewer"
import { FileExplorerPath } from "./components/file-explorer-path"
import { FileExplorerSelectionInfo } from "./components/file-explorer-selection-info"
import { NewFolderEntry } from "./components/new-folder-entry"
import { StorageEntry } from "./components/storage-entry"
import "./file-explorer.less"

const SEARCH_DEBOUNCE_MS = 300

const closeTabConfirmation = (event: BeforeUnloadEvent) => {
  event.preventDefault()
  event.returnValue = ""
}

const FileExplorerPage: Component = () => {
  const { notify } = toastCtl
  const params = useParams()
  const [searchParams, setSearchParams] = useSearchParams()

  const { status: uploadStatus, setStatus: setUploadStatus } =
    globalUploadProgressCtl

  const $renameEntry = createMutation(renameStorageEntry)
  const $moveEntries = createMutation(moveStorageEntries)
  const $deleteEntries = createMutation(deleteStorageEntries)
  const $createFolder = createMutation(createStorageFolder)

  let searchInputFieldRef: HTMLInputElement
  let browserContentsRef: HTMLDivElement
  const entryRefs: HTMLDivElement[] = []

  // prettier-ignore
  const folderId = createMemo(() =>
    (searchParams.folderId
      ? Number.parseInt(searchParams.folderId, 10)
      // eslint-disable-next-line no-undefined
      : undefined)
  )

  const {
    layout,
    setLayout,

    sortBy,
    setSortBy,

    sortDirection,
    setSortDirection,

    sortFn,
  } = useFileExplorerDisplayConfig()

  const [search, setSearch] = createSignal("")

  const {
    folderEntries,
    folderEntriesError,
    folderPath,
    invalidateEntries,
    selectedEntries,
    onSelect,
    setContextMenuTargetEntry,
    contextMenuTargetEntryIsInMultiselect,
    resetSelection,
    setSelectedEntries,
    contextMenuTargetEntry,
  } = useFileExplorer({
    endpointId: () => params.endpointId as string,
    folderId: () => searchParams.folderId,

    entriesSortFn: sortFn,
    // eslint-disable-next-line solid/reactivity
    entriesFilterFn: () => (entry) => {
      if (!search()) return true

      return entry.name.toLowerCase().includes(search()!.toLowerCase())
    },
  })

  const { onDragOver, onDragLeave, onDragEnter, isAboutToDrop, onDrop } =
    useFilesDrop()

  const {
    open: openEntryContextMenu,
    close: closeEntryContextMenu,
    contextMenuProps: entryContextMenuProps,
  } = useContextMenu({
    onClose: () => {
      setContextMenuTargetEntry(null)
    },
  })

  const {
    open: openGeneralContextMenu,
    close: closeGeneralContextMenu,
    contextMenuProps: generalContextMenuProps,
  } = useContextMenu()

  const {
    open: openSelectionContextMenu,
    close: closeSelectionContextMenu,
    contextMenuProps: selectionContextMenuProps,
  } = useContextMenu()

  const [entriesToDelete, setEntriesToDelete] = createSignal<{
    folderIds: number[]
    fileIds: number[]
  } | null>(null)

  const [entryIndexToPreview, setEntryIndexToPreview] = createSignal<
    number | null
  >(null)
  const [entryToRename, setEntryToRename] = createSignal<number | null>(null)
  const [folderCreationInitiated, setFolderCreationInitiated] =
    createSignal(false)

  const [infoPanelSelectedEntryId, setInfoPanelSelectedEntryId] = createSignal<
    number | null
  >(null)

  const isFolderEmpty = createMemo(() => folderEntries().length === 0)

  const infoPanelSelectedEntry = createMemo(() => {
    if (infoPanelSelectedEntryId() === null) {
      return null
    }

    return folderEntries().find(
      (entry) => entry.id === infoPanelSelectedEntryId()
    )
  })

  const { thumbnails, refresh: refreshThumbnails } = useFileExplorerThumbnails({
    endpointId: () => Number.parseInt(params.endpointId as string, 10),

    browserContentsRef: () => browserContentsRef,
    entryRefs: () => entryRefs,

    entries: folderEntries,
  })

  createEffect(() => {
    if (uploadStatus.numberOfFiles === 0) {
      window.removeEventListener("beforeunload", closeTabConfirmation)
    } else {
      window.addEventListener("beforeunload", closeTabConfirmation)
    }

    onCleanup(() => {
      window.removeEventListener("beforeunload", closeTabConfirmation)
    })
  })

  createEffect(
    on(
      () => folderId(),
      () => {
        batch(() => {
          setFolderCreationInitiated(false)
          setEntryToRename(null)

          setSearch("")
          searchInputFieldRef.value = ""
        })
      }
    )
  )

  const previewableEntries = createMemo(() =>
    folderEntries().filter(
      (entry) =>
        entry.mime_type?.startsWith("image/") ||
        entry.mime_type?.startsWith("video/") ||
        entry.mime_type?.startsWith("audio/")
    )
  )

  const entryToPreview = createMemo(() => {
    if (entryIndexToPreview() === null) return null

    return previewableEntries()[entryIndexToPreview()!]
  })

  const getEntryForPreview = (direction: "prev" | "next") => {
    const currentIndex = entryIndexToPreview()

    if (currentIndex === null) return

    if (direction === "prev") {
      if (currentIndex === 0) {
        setEntryIndexToPreview(previewableEntries().length - 1)
      } else {
        setEntryIndexToPreview(currentIndex - 1)
      }
    } else {
      if (currentIndex === previewableEntries().length - 1) {
        setEntryIndexToPreview(0)
      } else {
        setEntryIndexToPreview(currentIndex + 1)
      }
    }
  }

  const findPreviewableEntryIndex = (entryId: number) => {
    if (previewableEntries().length === 0) return null

    for (let i = 0; i < previewableEntries().length; i++) {
      if (previewableEntries()[i]?.id === entryId) {
        return i
      }
    }

    return null
  }

  const partitionEntries = (entries: SelectedEntry[]) => {
    if (entries.length === 0) return { folderIds: [], fileIds: [] }

    const folderIds = []
    const fileIds = []

    for (const entry of entries) {
      const entrySignatureSegments = entry.split(":")
      const entryId = Number.parseInt(entrySignatureSegments[1]!, 10)

      if (entrySignatureSegments[0] === "file") {
        fileIds.push(entryId)
      } else {
        folderIds.push(entryId)
      }
    }

    return {
      folderIds,
      fileIds,
    }
  }

  const createFolder = (newFolderName: string) => {
    $createFolder.mutate(
      {
        endpointId: Number.parseInt(params.endpointId as string, 10),
        folderId: folderId(),

        newFolderName,
      },
      {
        onSuccess: () => {
          void invalidateEntries()

          setFolderCreationInitiated(false)
        },
        onError: (error) => genericErrorToast(error),
      }
    )
  }

  /**
   * Deltes entries passed via arguments. If no arguments are passed, deletes entries that are currently selected for deletion
   */
  const performDeletion = (
    requestedFolderIds?: number[],
    requestedFileIds?: number[]
  ) => {
    let folderIds = []
    let fileIds = []

    if (requestedFileIds || requestedFolderIds) {
      folderIds = requestedFolderIds ?? []
      fileIds = requestedFileIds ?? []
    } else if (entriesToDelete() === null) {
      return
    } else {
      folderIds = entriesToDelete()!.folderIds
      fileIds = entriesToDelete()!.fileIds
    }

    $deleteEntries.mutate(
      {
        endpointId: Number.parseInt(params.endpointId as string, 10),
        fileIds,
        folderIds,
      },
      {
        onSuccess: () => {
          batch(() => {
            setEntriesToDelete(null)

            resetSelection()
            void invalidateEntries()
          })
        },
        onError: (error) => genericErrorToast(error),
      }
    )
  }

  const deleteEntries = (
    folderIds: number[],
    fileIds: number[],
    skipConfirmation = false
  ) => {
    if (skipConfirmation) {
      performDeletion(folderIds, fileIds)
    } else {
      setEntriesToDelete({
        folderIds,
        fileIds,
      })
    }
  }

  const renameEntry = (
    entryId: number,
    entryType: IStorageEntry["entry_type"],
    name: string
  ) => {
    $renameEntry.mutate(
      {
        endpointId: Number.parseInt(params.endpointId as string, 10),
        entryType,
        entryId,
        name,
      },
      {
        onSuccess: () => {
          setEntryToRename(null)
          void invalidateEntries()
        },
        onError: (error) => genericErrorToast(error),
      }
    )
  }

  const moveEntries = (
    entries: SelectedEntry[],
    targetFolderId?: number | null
  ) => {
    const { fileIds, folderIds } = partitionEntries(entries)

    $moveEntries.mutate(
      {
        endpointId: Number.parseInt(params.endpointId as string, 10),
        fileIds,
        folderIds,
        targetFolderId:
          // eslint-disable-next-line no-undefined
          targetFolderId === null ? undefined : targetFolderId ?? folderId(),
      },
      {
        onSuccess: () => {
          resetSelection()
          void invalidateEntries()
        },
        onError: (error) => genericErrorToast(error),
      }
    )
  }

  const handleDrop = (filesToUpload: FileWithPath[]) => {
    let totalSizeBytes = 0

    for (const file of filesToUpload) {
      totalSizeBytes += file.size
    }

    setUploadStatus({ numberOfFiles: filesToUpload.length, totalSizeBytes })

    const data = new FormData()

    for (const file of filesToUpload) {
      // TODO Make sure if it's ok to store the file name in the FormData's field.name
      const path =
        // eslint-disable-next-line unicorn/prefer-at
        file.path[file.path.length - 1] === "/"
          ? file.path.slice(0, Math.max(0, file.path.length - 1))
          : file.path

      data.append(file.name, file, path)
    }

    const uploadUrl = new URL(`${location.origin}/api/storage/upload`)

    uploadUrl.searchParams.set("endpoint_id", params.endpointId as string)

    if (searchParams.folderId) {
      uploadUrl.searchParams.set("target_folder", searchParams.folderId)
    }

    const request = new XMLHttpRequest()

    request.upload.addEventListener("progress", (progressEvent) => {
      if (progressEvent.lengthComputable) {
        setUploadStatus(
          "percentageUploaded",
          progressEvent.loaded / progressEvent.total
        )
      }
    })

    request.addEventListener("loadend", (loadendEvent) => {
      const json = TUploadEntries.parse(
        JSON.parse(
          (loadendEvent.target as { responseText?: string }).responseText ?? ""
        )
      )

      if (json.error) {
        genericErrorToast(json.error)
      }

      if (json.skipped_files && json.skipped_files.length > 0) {
        notify({
          title: `${json.skipped_files.length} of ${filesToUpload.length} files were not uploaded`,
          content: json.skipped_files.join(", "),
          duration: 30_000,
          icon: "file_copy",
          severity: "warning",
        })
      }

      setUploadStatus({
        numberOfFiles: 0,
        percentageUploaded: 0,
      })

      void invalidateEntries()
    })

    request.addEventListener("error", () => {
      genericErrorToast({ code: "storage.upload.other" })
    })

    request.open("POST", uploadUrl, true)
    request.send(data)
  }

  const navigateToFolder = (targetFolderId: number) => {
    setSearchParams({ folderId: targetFolderId.toString() })
  }

  const downloadFile = (fileId: number) => {
    void downloadStorageFile({
      endpointId: params.endpointId as string,
      fileId,
    })
  }

  const downloadSelectedEntries = () => {
    const { folderIds, fileIds } = partitionEntries([...selectedEntries()])

    void downloadStorageFilesZip({
      endpointId: params.endpointId as string,
      folderIds,
      fileIds,
    })
  }

  const downloadFolder = (entryId: number) => {
    void downloadStorageFilesZip({
      endpointId: params.endpointId as string,
      folderIds: [entryId],
      fileIds: [],
    })
  }

  // eslint-disable-next-line sonarjs/cognitive-complexity
  onMount(() => {
    const keydownHandler = (event: KeyboardEvent) => {
      // Go up one folder
      if (event.ctrlKey && event.key === "Backspace") {
        event.preventDefault()

        if (folderPath().length === 0) return

        // eslint-disable-next-line @typescript-eslint/no-magic-numbers
        const parentFolder = folderPath()[folderPath().length - 2]

        setSearchParams({
          folderId: parentFolder?.id.toString() ?? null,
        })
      }

      // Reset selection
      if (event.key === "Escape") {
        event.preventDefault()

        setInfoPanelSelectedEntryId(null)
        resetSelection()
      }

      // Select all
      if (event.key === "a" && event.ctrlKey) {
        event.preventDefault()

        setSelectedEntries(
          new Set<SelectedEntry>(
            folderEntries().map(
              (entry) => `${entry.entry_type}:${entry.id}`
            ) as SelectedEntry[]
          )
        )
      }

      // Download selected entries
      if (event.key === "s" && event.ctrlKey) {
        event.preventDefault()

        if (selectedEntries().size === 0) return

        if (selectedEntries().size === 1) {
          const entry = selectedEntries().values().next().value as
            | SelectedEntry
            | undefined

          if (!entry) return

          const [entryType, entryId] = entry.split(":")

          if (entryType === "file" && entryId) {
            downloadFile(Number.parseInt(entryId, 10))
          } else {
            downloadSelectedEntries()
          }
        } else {
          downloadSelectedEntries()
        }
      }

      // delete selected entries
      if (event.key === "Delete") {
        event.preventDefault()

        if (selectedEntries().size === 0) return

        const { folderIds, fileIds } = partitionEntries([...selectedEntries()])

        deleteEntries(folderIds, fileIds, event.shiftKey)
      }

      // Focus onto search field
      if (event.key === "f" && event.ctrlKey) {
        event.preventDefault()

        searchInputFieldRef.select()
      }
    }

    let searchDebounce = 0

    const searchInputFieldInputHandler = () => {
      clearTimeout(searchDebounce)

      searchDebounce = setTimeout(() => {
        setSearch(searchInputFieldRef.value)
      }, SEARCH_DEBOUNCE_MS)
    }

    const searchInputFieldKeydownHandler = (event: KeyboardEvent) => {
      if (event.key === "Escape" || event.key === "Enter") {
        searchInputFieldRef.blur()
      }

      event.stopImmediatePropagation()
      event.stopPropagation()
    }

    searchInputFieldRef.addEventListener("input", searchInputFieldInputHandler)
    searchInputFieldRef.addEventListener(
      "keydown",
      searchInputFieldKeydownHandler
    )
    window.addEventListener("keydown", keydownHandler)

    onCleanup(() => {
      searchInputFieldRef.removeEventListener(
        "input",
        searchInputFieldInputHandler
      )
      searchInputFieldRef.removeEventListener(
        "keydown",
        searchInputFieldKeydownHandler
      )
      window.removeEventListener("keydown", keydownHandler)
    })
  })

  return (
    <div
      id="page-storage-file-explorer"
      onDrop={onDrop(handleDrop)}
      onDragEnter={onDragEnter}
      onDragLeave={onDragLeave}
      onDragOver={onDragOver}
    >
      <FileExplorerDeleteModal
        subtitle={`${
          (entriesToDelete()?.fileIds.length ?? 0) +
          (entriesToDelete()?.folderIds.length ?? 0)
        } entries selected`}
        open={entriesToDelete() !== null}
        onClose={() => setEntriesToDelete(null)}
        onConfirm={() => performDeletion()}
      />
      <Show when={entryToPreview()}>
        <FileExplorerMediaViewer
          endpointId={params.endpointId as string}
          entry={entryToPreview()!}
          onPrev={() => getEntryForPreview("prev")}
          onNext={() => getEntryForPreview("next")}
          onDelete={(force) => {
            deleteEntries([], [entryToPreview()!.id], force)
          }}
          onDownload={() => downloadFile(entryToPreview()!.id)}
          onInfoPanelSelect={() =>
            setInfoPanelSelectedEntryId(entryToPreview()!.id)
          }
          onSelect={() => {
            // TODO refactor
            onSelect(
              folderEntries().findIndex(
                (entry) => entry.id === entryToPreview()!.id
              )
            )
          }}
          onClose={() => setEntryIndexToPreview(null)}
        />
      </Show>

      <DropFilesHere active={isAboutToDrop()} />

      <div class="page-container">
        <div class="browser-container">
          <div class="top-container">
            <FileExplorerPath
              path={folderPath()}
              onNavigate={(newFolderId) =>
                setSearchParams({ folderId: newFolderId })
              }
              onMove={(sourceEntrySignature, targetFolderId) => {
                const isInMultiselect =
                  selectedEntries().has(sourceEntrySignature)

                if (isInMultiselect) {
                  moveEntries([...selectedEntries()], targetFolderId)
                } else {
                  moveEntries([sourceEntrySignature], targetFolderId)
                }
              }}
            />
            <Stack direction="row" alignItems="center" spacing="1em">
              <div class="entries-search-container">
                <input
                  classList={{
                    "non-empty": search() !== "",
                  }}
                  ref={searchInputFieldRef!}
                  type="text"
                  placeholder="Search..."
                />
              </div>

              <div class="top-container-separator" />

              <FileExplorerDisplaySettings
                layout={layout()}
                setLayout={setLayout}
                sortBy={sortBy()}
                setSortBy={setSortBy}
                sortDirection={sortDirection()}
                setSortDirection={setSortDirection}
              />
              <Show when={selectedEntries().size > 0}>
                <div class="top-container-separator" />
                <FileExplorerSelectionInfo
                  selectedEntriesCount={selectedEntries().size}
                  onClick={openSelectionContextMenu}
                />
              </Show>
            </Stack>
          </div>
          <div
            ref={browserContentsRef!}
            class="browser-contents"
            onContextMenu={(event) => {
              event.preventDefault()
              event.stopPropagation()
              event.stopImmediatePropagation()

              openGeneralContextMenu(event)
            }}
          >
            <Show when={isFolderEmpty()}>
              <div class="folder-notice-container">
                <Switch
                  fallback={<div class="folder-notice">Empty folder</div>}
                >
                  <Match
                    when={
                      folderEntriesError()?.code ===
                      "storage.entries.unauthorized"
                    }
                  >
                    <div class="folder-notice error">Folder access denied</div>
                  </Match>
                </Switch>
              </div>
            </Show>

            <ContextMenu {...generalContextMenuProps()}>
              <ContextMenuSection>
                <ContextMenuLink
                  icon="folder"
                  onClick={() => {
                    setFolderCreationInitiated(true)

                    closeGeneralContextMenu()
                  }}
                >
                  New Folder
                </ContextMenuLink>

                <Show when={selectedEntries().size > 0}>
                  <div class="separator" />

                  <ContextMenuLink
                    icon="arrow_downward"
                    onClick={() => {
                      moveEntries([...selectedEntries()])
                      closeGeneralContextMenu()
                    }}
                  >
                    Move {selectedEntries().size} entries here
                  </ContextMenuLink>
                </Show>

                <div class="separator" />

                <ContextMenuLink
                  icon="cached"
                  onClick={() => {
                    void invalidateEntries()
                    void refreshThumbnails()
                    closeGeneralContextMenu()
                  }}
                >
                  Refresh
                </ContextMenuLink>
              </ContextMenuSection>
            </ContextMenu>

            <ContextMenu {...selectionContextMenuProps()}>
              <ContextMenuSection>
                <ContextMenuLink
                  icon="remove_selection"
                  tip="esc"
                  onClick={() => {
                    setSelectedEntries(new Set<SelectedEntry>())
                    closeSelectionContextMenu()
                  }}
                >
                  Remove selection
                </ContextMenuLink>

                <div class="separator" />

                <ContextMenuLink
                  icon="arrow_downward"
                  onClick={() => {
                    moveEntries([...selectedEntries()])
                    closeSelectionContextMenu()
                  }}
                >
                  Move here
                </ContextMenuLink>
              </ContextMenuSection>
            </ContextMenu>

            <ContextMenu {...entryContextMenuProps()}>
              <Show
                when={
                  !(
                    selectedEntries().size > 1 &&
                    contextMenuTargetEntryIsInMultiselect()
                  )
                }
                fallback={
                  <ContextMenuSection>
                    <ContextMenuLink
                      icon="remove_selection"
                      tip="esc"
                      onClick={() => {
                        setSelectedEntries(new Set<SelectedEntry>())
                      }}
                    >
                      Remove selection
                    </ContextMenuLink>

                    <div class="separator" />

                    <ContextMenuLink
                      icon="download"
                      tip="ctrl+s"
                      onClick={() => {
                        downloadSelectedEntries()
                        closeEntryContextMenu()
                      }}
                    >
                      Download selected entries
                    </ContextMenuLink>

                    <ContextMenuLink
                      icon="delete_sweep"
                      tip="del"
                      onClick={() => {
                        const { folderIds, fileIds } = partitionEntries([
                          ...selectedEntries(),
                        ])

                        deleteEntries(folderIds, fileIds)
                        closeEntryContextMenu()
                      }}
                    >
                      Delete selected entries
                    </ContextMenuLink>
                  </ContextMenuSection>
                }
              >
                <ContextMenuSection>
                  <Show
                    when={contextMenuTargetEntry()?.entry_type === "folder"}
                  >
                    <Stack
                      style={{
                        padding: "0.5em 1.5em",
                      }}
                      spacing={"0.25em"}
                    >
                      <Text
                        fontWeight={500}
                        fontSize="var(--text-sm)"
                        color="var(--color-text-grey-05)"
                      >
                        Folder
                      </Text>
                      <Text
                        variant="secondary"
                        fontSize="var(--text-sm)"
                        fontWeight={450}
                        style={{
                          "max-width": "20em",
                          "word-break": "break-all",
                        }}
                      >
                        {contextMenuTargetEntry()!.name}
                      </Text>
                    </Stack>

                    <div class="separator" />

                    <ContextMenuLink
                      icon="folder_open"
                      onClick={() => {
                        navigateToFolder(contextMenuTargetEntry()!.id)
                        closeEntryContextMenu()
                      }}
                    >
                      Open folder
                    </ContextMenuLink>

                    <div class="separator" />

                    <ContextMenuLink
                      icon="download"
                      onClick={() => {
                        downloadFolder(contextMenuTargetEntry()!.id)
                        closeEntryContextMenu()
                      }}
                    >
                      Download folder (zip)
                    </ContextMenuLink>

                    <div class="separator" />

                    <ContextMenuLink
                      icon="edit"
                      onClick={() => {
                        setEntryToRename(contextMenuTargetEntry()!.id)
                        closeEntryContextMenu()
                      }}
                    >
                      Rename
                    </ContextMenuLink>

                    <ContextMenuLink
                      icon="delete"
                      onClick={() => {
                        deleteEntries([contextMenuTargetEntry()!.id], [])
                        closeEntryContextMenu()
                      }}
                    >
                      Delete
                    </ContextMenuLink>
                  </Show>
                  <Show when={contextMenuTargetEntry()?.entry_type === "file"}>
                    <Stack
                      spacing={"0.25em"}
                      style={{
                        padding: "0.5em 1.5em",
                      }}
                    >
                      <Text
                        fontWeight={500}
                        fontSize={"var(--text-sm)"}
                        color="var(--color-text-grey-05)"
                      >
                        File
                      </Text>
                      <Text
                        variant="secondary"
                        fontSize={"var(--text-sm)"}
                        fontWeight={450}
                        style={{
                          "max-width": "20em",
                          "word-break": "break-all",
                        }}
                      >
                        {contextMenuTargetEntry()!.name}
                        {contextMenuTargetEntry()!.extension
                          ? `.${contextMenuTargetEntry()!.extension!}`
                          : ""}
                      </Text>
                    </Stack>

                    <div class="separator" />

                    <ContextMenuLink
                      icon="download"
                      onClick={() => {
                        if (contextMenuTargetEntry()) {
                          downloadFile(contextMenuTargetEntry()!.id)
                          closeEntryContextMenu()
                        }
                      }}
                    >
                      Download
                    </ContextMenuLink>

                    <div class="separator" />

                    <ContextMenuLink
                      icon="edit"
                      onClick={() => {
                        setEntryToRename(contextMenuTargetEntry()!.id)
                        closeEntryContextMenu()
                      }}
                    >
                      Rename
                    </ContextMenuLink>

                    <ContextMenuLink
                      icon="delete"
                      onClick={() => {
                        deleteEntries([], [contextMenuTargetEntry()!.id])
                        closeEntryContextMenu()
                      }}
                    >
                      Delete
                    </ContextMenuLink>
                  </Show>
                </ContextMenuSection>
              </Show>
            </ContextMenu>
            <div
              classList={{
                items: true,
                [`layout-${layout()}`]: true,
              }}
            >
              {/* TODO: Maybe use Index instaed of For? */}
              <For each={folderEntries()}>
                {(entry, index) => {
                  const selected = createMemo(() =>
                    selectedEntries().has(`${entry.entry_type}:${entry.id}`)
                  )

                  const isContextMenuTarget = createMemo(
                    () => contextMenuTargetEntry()?.id === entry.id
                  )

                  const isRenaming = createMemo(
                    () => entryToRename() === entry.id
                  )

                  return (
                    <StorageEntry
                      ref={(entryRef: HTMLDivElement) => {
                        entryRefs[index()] = entryRef
                      }}
                      isRenaming={isRenaming()}
                      entry={entry}
                      selected={selected()}
                      isContextMenuTarget={isContextMenuTarget()}
                      thumbnails={thumbnails()}
                      onDblClick={() => {
                        if (entry.entry_type === "folder" && !isRenaming()) {
                          navigateToFolder(entry.id)
                        } else {
                          const previewableEntryIndex =
                            findPreviewableEntryIndex(entry.id)

                          if (previewableEntryIndex !== null) {
                            setEntryIndexToPreview(previewableEntryIndex)
                          }
                        }
                      }}
                      onOpenContextMenu={(event) => {
                        setContextMenuTargetEntry(entry)
                        openEntryContextMenu(event)
                      }}
                      onSelect={(event) => {
                        onSelect(index(), event)
                      }}
                      onClick={() => {
                        setInfoPanelSelectedEntryId(entry.id)
                      }}
                      onRename={(newName) => {
                        if (entry.name === newName || newName === "") {
                          setEntryToRename(null)
                        } else {
                          renameEntry(entry.id, entry.entry_type, newName)
                        }
                      }}
                      onMove={(sourceEntrySignature, targetFolderId) => {
                        const isInMultiselect =
                          selectedEntries().has(sourceEntrySignature)

                        if (isInMultiselect) {
                          moveEntries([...selectedEntries()], targetFolderId)
                        } else {
                          moveEntries([sourceEntrySignature], targetFolderId)
                        }
                      }}
                      onCancelRename={() => setEntryToRename(null)}
                    />
                  )
                }}
              </For>
              <NewFolderEntry
                endpointId={Number.parseInt(params.endpointId as string, 10)}
                folderId={folderId()}
                show={folderCreationInitiated()}
                onCreate={(folderName) => {
                  createFolder(folderName)
                }}
                onClose={() => setFolderCreationInitiated(false)}
              />
            </div>
          </div>
        </div>
        <div class="side-panel">
          <Show when={infoPanelSelectedEntry()}>
            <FileExplorerInfoPanel
              endpointId={Number.parseInt(params.endpointId as string, 10)}
              thumbnails={thumbnails()}
              entry={infoPanelSelectedEntry()!}
              onRename={(name) =>
                renameEntry(
                  infoPanelSelectedEntry()!.id,
                  infoPanelSelectedEntry()!.entry_type,
                  name
                )
              }
              onThumbnailClick={() => {
                const previewableEntryIndex = findPreviewableEntryIndex(
                  infoPanelSelectedEntry()!.id
                )

                if (previewableEntryIndex !== null) {
                  setEntryIndexToPreview(previewableEntryIndex)
                }
              }}
            />
          </Show>
        </div>
      </div>
    </div>
  )
}

export default FileExplorerPage
