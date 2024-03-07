/* eslint-disable unicorn/prevent-abbreviations */

/* eslint-disable no-warning-comments */

/* eslint-disable unicorn/consistent-function-scoping */
import {
  Component,
  For,
  Show,
  createEffect,
  createMemo,
  createSignal,
  on,
  onCleanup,
  onMount,
} from "solid-js"
import { createStore } from "solid-js/store"

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
import { FileExplorerDisplaySettings } from "./components/file-explorer-display-settings"
import { FileExplorerInfoPanel } from "./components/file-explorer-info-panel"
import { FileExplorerPath } from "./components/file-explorer-path"
import { FileExplorerSelectionInfo } from "./components/file-explorer-selection-info"
import { FileExplorerUploadStatusToast } from "./components/file-explorer-upload-status-toast"
import { NewFolderEntry } from "./components/new-folder-entry"
import { StorageEntry } from "./components/storage-entry"
import "./file-explorer.less"

const closeTabConfirmation = (event: BeforeUnloadEvent) => {
  event.preventDefault()
  event.returnValue = ""
}

const FileExplorerPage: Component = () => {
  const { notify } = toastCtl
  const params = useParams()
  const [searchParams, setSearchParams] = useSearchParams()

  const $renameEntry = createMutation(renameStorageEntry)
  const $moveEntries = createMutation(moveStorageEntries)
  const $deleteEntries = createMutation(deleteStorageEntries)
  const $createFolder = createMutation(createStorageFolder)

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

  const {
    folderEntries,
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
  })

  const { onDragLeave, onDragOver, isAboutToDrop, onDrop } = useFilesDrop()

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

  const [uploadStatus, setUploadStatus] = createStore({
    numberOfFiles: 0,
    percentageUploaded: 0,
    totalSizeBytes: 0,
  })

  const [entryToRename, setEntryToRename] = createSignal<number | null>(null)
  const [folderCreationInitiated, setFolderCreationInitiated] =
    createSignal(false)

  const [infoPanelSelectedEntryId, setInfoPanelSelectedEntryId] = createSignal<
    number | null
  >(null)

  const infoPanelSelectedEntry = createMemo(() => {
    if (infoPanelSelectedEntryId() === null) {
      return null
    }

    return folderEntries().find(
      (entry) => entry.id === infoPanelSelectedEntryId()
    )
  })

  const { thumbnails } = useFileExplorerThumbnails({
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
        setFolderCreationInitiated(false)
        setEntryToRename(null)
      }
    )
  )

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

  const deleteEntries = (folderIds: number[], fileIds: number[]) => {
    $deleteEntries.mutate(
      {
        endpointId: Number.parseInt(params.endpointId as string, 10),
        fileIds,
        folderIds,
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

  const moveEntries = (entries: SelectedEntry[]) => {
    const { fileIds, folderIds } = partitionEntries(entries)

    $moveEntries.mutate(
      {
        endpointId: Number.parseInt(params.endpointId as string, 10),
        fileIds,
        folderIds,
        targetFolderId: folderId(),
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

        downloadSelectedEntries()
      }

      // Quick delete selected entries (no confirmation)
      if (event.key === "Delete" && event.shiftKey) {
        event.preventDefault()

        if (selectedEntries().size === 0) return

        const { folderIds, fileIds } = partitionEntries([...selectedEntries()])

        deleteEntries(folderIds, fileIds)
      }
    }

    window.addEventListener("keydown", keydownHandler)

    onCleanup(() => {
      window.removeEventListener("keydown", keydownHandler)
    })
  })

  return (
    <div
      id="page-storage-file-explorer"
      onDrop={onDrop(handleDrop)}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
    >
      <DropFilesHere active={isAboutToDrop()} />

      <Show when={uploadStatus.numberOfFiles !== 0}>
        <FileExplorerUploadStatusToast
          percentageUploaded={uploadStatus.percentageUploaded}
          numberOfFiles={uploadStatus.numberOfFiles}
          totalSizeBytes={uploadStatus.totalSizeBytes}
        />
      </Show>

      <div class="page-container">
        <div class="browser-container">
          <div class="top-container">
            <FileExplorerPath
              path={folderPath()}
              onNavigate={(newFolderId) =>
                setSearchParams({ folderId: newFolderId })
              }
            />
            <Stack direction="row" alignItems="center" spacing="1em">
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
                      onClick={() => {
                        setSelectedEntries(new Set<SelectedEntry>())
                      }}
                    >
                      Remove selection
                    </ContextMenuLink>

                    <div class="separator" />

                    <ContextMenuLink
                      icon="download"
                      onClick={() => {
                        downloadSelectedEntries()
                        closeEntryContextMenu()
                      }}
                    >
                      Download selected entries
                    </ContextMenuLink>

                    <ContextMenuLink
                      icon="delete_sweep"
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
                      Rename folder
                    </ContextMenuLink>

                    <ContextMenuLink
                      icon="delete"
                      onClick={() => {
                        deleteEntries([contextMenuTargetEntry()!.id], [])
                        closeEntryContextMenu()
                      }}
                    >
                      Delete folder
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
                      Rename file
                    </ContextMenuLink>

                    <ContextMenuLink
                      icon="delete"
                      onClick={() => {
                        deleteEntries([], [contextMenuTargetEntry()!.id])
                        closeEntryContextMenu()
                      }}
                    >
                      Delete file
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
                      onNavigateToFolder={navigateToFolder}
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
              thumbnails={thumbnails()}
              entry={infoPanelSelectedEntry()!}
              onRename={(name) =>
                renameEntry(
                  infoPanelSelectedEntry()!.id,
                  infoPanelSelectedEntry()!.entry_type,
                  name
                )
              }
            />
          </Show>
        </div>
      </div>
    </div>
  )
}

export default FileExplorerPage
