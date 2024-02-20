/* eslint-disable unicorn/prevent-abbreviations */

/* eslint-disable no-undefined */

/* eslint-disable no-warning-comments */

/* eslint-disable unicorn/consistent-function-scoping */
import {
  Component,
  For,
  Show,
  createEffect,
  createMemo,
  createSignal,
} from "solid-js"
import { createStore } from "solid-js/store"

import { useParams, useSearchParams } from "@solidjs/router"
import { createMutation } from "@tanstack/solid-query"

import { Checkbox } from "@/app/components/common/checkbox/checkbox"
import { Icon } from "@/app/components/common/icon/icon"
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

import { DropFilesHere } from "../../components/drop-files-here"
import { useFileExplorer } from "../../file-explorer/use-file-explorer"
import {
  createStorageFolder,
  deleteStorageEntries,
  downloadStorageFile,
  downloadStorageFilesZip,
} from "../../storage-entry/storage-entry.api"
import { TUploadEntries } from "../../storage-entry/storage-entry.codecs"
import { FileWithPath } from "../../upload"
import { FileExplorerPath } from "./components/file-explorer-path"
import { FileExplorerUploadStatusToast } from "./components/file-explorer-upload-status-toast"
import { NewFolderEntry } from "./components/new-folder-entry"
import "./file-explorer.less"

const closeTabConfirmation = (event: BeforeUnloadEvent) => {
  event.preventDefault()
  event.returnValue = ""
}

const FileExplorerPage: Component = () => {
  const { notify } = toastCtl
  const params = useParams()

  const { onDragLeave, onDragOver, isAboutToDrop, onDrop } = useFilesDrop()

  const {
    open: openEntryContextMenu,
    close: closeEntryContextMenu,
    contextMenuProps: entryContextMenuProps,
  } = useContextMenu()

  const {
    open: openGeneralContextMenu,
    close: closeGeneralContextMenu,
    contextMenuProps: generalContextMenuProps,
  } = useContextMenu()

  const [uploadStatus, setUploadStatus] = createStore({
    numberOfFiles: 0,
    percentageUploaded: 0,
    totalSizeBytes: 0,
  })

  const [folderCreationInitiated, setFolderCreationInitiated] =
    createSignal(false)

  const [searchParams, setSearchParams] = useSearchParams()

  const $deleteEntries = createMutation(deleteStorageEntries)
  const $createFolder = createMutation(createStorageFolder)

  const {
    folderEntries,
    folderPath,
    invalidateEntries,
    selectedEntries,
    onSelect,
    setTemporarySelectedEntry,
    temporarySelectedEntryIsInMultiselect,
    resetSelection,
    setSelectedEntries,
    temporarySelectedEntry,
  } = useFileExplorer({
    endpointId: () => params.endpointId as string,
    folderId: () => searchParams.folderId,
  })

  const createFolder = (newFolderName: string) => {
    $createFolder.mutate(
      {
        endpointId: Number.parseInt(params.endpointId as string, 10),
        folderId: searchParams.folderId
          ? Number.parseInt(searchParams.folderId, 10)
          : undefined,

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

  createEffect(() => {
    if (uploadStatus.numberOfFiles === 0) {
      window.removeEventListener("beforeunload", closeTabConfirmation)
    } else {
      window.addEventListener("beforeunload", closeTabConfirmation)
    }
  })

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

  const navigateToFolder = (folderId: number) => {
    setSearchParams({ folderId: folderId.toString() })
  }

  const downloadFile = (fileId: number) => {
    void downloadStorageFile({
      endpointId: params.endpointId as string,
      fileId,
    })
  }

  // TODO This should be refactored, its horribly inefficient.
  const downloadSelectedEntries = () => {
    const folderIds: number[] = []
    const fileIds: number[] = []

    for (const entryId of selectedEntries()) {
      const entry = folderEntries().find((e) => e.id === entryId)

      if (entry) {
        if (entry.entry_type === "folder") {
          folderIds.push(entryId)
        } else {
          fileIds.push(entryId)
        }
      }
    }

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
          </div>
          <div
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

            <ContextMenu {...entryContextMenuProps()}>
              <Show
                when={
                  !(
                    selectedEntries().size > 1 &&
                    temporarySelectedEntryIsInMultiselect()
                  )
                }
                fallback={
                  <ContextMenuSection>
                    <ContextMenuLink
                      icon="remove_selection"
                      onClick={() => {
                        setSelectedEntries(new Set<number>())
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
                      Download {selectedEntries().size} entries
                    </ContextMenuLink>

                    <ContextMenuLink
                      icon="delete_sweep"
                      onClick={() => {
                        const folderIds: number[] = []
                        const fileIds: number[] = []

                        for (const entryId of selectedEntries()) {
                          const entry = folderEntries().find(
                            (e) => e.id === entryId
                          )

                          if (entry) {
                            if (entry.entry_type === "folder") {
                              folderIds.push(entryId)
                            } else {
                              fileIds.push(entryId)
                            }
                          }
                        }

                        deleteEntries(folderIds, fileIds)
                        closeEntryContextMenu()
                      }}
                    >
                      Delete {selectedEntries().size} entries
                    </ContextMenuLink>
                  </ContextMenuSection>
                }
              >
                <ContextMenuSection>
                  <Show
                    when={temporarySelectedEntry()?.entry_type === "folder"}
                  >
                    <ContextMenuLink
                      icon="download"
                      onClick={() => {
                        downloadFolder(temporarySelectedEntry()!.id)
                        closeEntryContextMenu()
                      }}
                    >
                      Download folder (zip)
                    </ContextMenuLink>

                    <div class="separator" />

                    <ContextMenuLink
                      icon="delete"
                      onClick={() => {
                        deleteEntries([temporarySelectedEntry()!.id], [])
                        closeEntryContextMenu()
                      }}
                    >
                      Delete folder
                    </ContextMenuLink>
                  </Show>
                  <Show when={temporarySelectedEntry()?.entry_type === "file"}>
                    <Text
                      variant="secondary"
                      fontSize={"var(--text-sm)"}
                      fontWeight={450}
                      style={{
                        "max-width": "20em",
                        "word-break": "break-all",
                        padding: "0.5em 1.5em",
                      }}
                    >
                      {temporarySelectedEntry()!.name}
                      {temporarySelectedEntry()!.extension
                        ? `.${temporarySelectedEntry()!.extension!}`
                        : ""}
                    </Text>

                    <div class="separator" />

                    <ContextMenuLink
                      icon="download"
                      onClick={() => {
                        if (temporarySelectedEntry()) {
                          downloadFile(temporarySelectedEntry()!.id)
                          closeEntryContextMenu()
                        }
                      }}
                    >
                      Download
                    </ContextMenuLink>

                    <div class="separator" />

                    <ContextMenuLink
                      icon="delete"
                      onClick={() => {
                        deleteEntries([], [temporarySelectedEntry()!.id])
                        closeEntryContextMenu()
                      }}
                    >
                      Delete file
                    </ContextMenuLink>
                  </Show>
                </ContextMenuSection>
              </Show>
            </ContextMenu>
            <div class="items">
              {/* TODO: Maybe use Index instaed of For? */}
              <For each={folderEntries()}>
                {(entry, idx) => {
                  const selected = createMemo(() =>
                    selectedEntries().has(entry.id)
                  )

                  return (
                    // TODO: Should be a clickable <button />
                    <div
                      classList={{ item: true, selected: selected() }}
                      onClick={() =>
                        entry.entry_type === "folder" &&
                        navigateToFolder(entry.id)
                      }
                      onContextMenu={(event) => {
                        event.preventDefault()
                        event.stopPropagation()
                        event.stopImmediatePropagation()

                        setTemporarySelectedEntry(entry)
                        openEntryContextMenu(event)
                      }}
                    >
                      <div class="item-select-container">
                        <Checkbox
                          size="m"
                          value={selected()}
                          onChange={(_, event) => {
                            onSelect(idx(), event)
                          }}
                        />
                      </div>
                      <div class="item-thumb">
                        <div class="icon">
                          <Icon
                            name={
                              entry.entry_type === "folder"
                                ? "folder_open"
                                : "draft"
                            }
                            type="outlined"
                            fill={1}
                            wght={500}
                            size={40}
                          />
                        </div>
                      </div>
                      <div class="item-info">
                        <div
                          class="item-name"
                          title={`${entry.name}${
                            entry.extension ? `.${entry.extension}` : ""
                          }`}
                        >
                          <div class="name">{entry.name}</div>
                          <Show when={entry.extension}>
                            <div class="extension">{entry.extension}</div>
                          </Show>
                        </div>
                      </div>
                    </div>
                  )
                }}
              </For>
              <NewFolderEntry
                endpointId={Number.parseInt(params.endpointId as string, 10)}
                folderId={
                  searchParams.folderId
                    ? Number.parseInt(searchParams.folderId, 10)
                    : undefined
                }
                show={folderCreationInitiated()}
                onCreate={(folderName) => {
                  createFolder(folderName)
                }}
              />
            </div>
          </div>
        </div>
        <div class="side-panel" />
      </div>
    </div>
  )
}

export default FileExplorerPage
