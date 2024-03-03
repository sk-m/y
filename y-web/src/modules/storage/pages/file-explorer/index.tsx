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
import { useFileExplorer } from "@/modules/storage/file-explorer/use-file-explorer"
import { useFileExplorerThumbnails } from "@/modules/storage/file-explorer/use-file-explorer-thumbnails"
import {
  createStorageFolder,
  deleteStorageEntries,
  downloadStorageFile,
  downloadStorageFilesZip,
} from "@/modules/storage/storage-entry/storage-entry.api"
import { TUploadEntries } from "@/modules/storage/storage-entry/storage-entry.codecs"
import { FileWithPath } from "@/modules/storage/upload"

import { FileExplorerPath } from "./components/file-explorer-path"
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

  // prettier-ignore
  const folderId = createMemo(() =>
    (searchParams.folderId
      ? Number.parseInt(searchParams.folderId, 10)
      // eslint-disable-next-line no-undefined
      : undefined)
  )

  let browserContentsRef: HTMLDivElement
  const entryRefs: HTMLDivElement[] = []

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

  const { onDragLeave, onDragOver, isAboutToDrop, onDrop } = useFilesDrop()

  const {
    open: openEntryContextMenu,
    close: closeEntryContextMenu,
    contextMenuProps: entryContextMenuProps,
  } = useContextMenu({
    onClose: () => {
      setTemporarySelectedEntry(null)
    },
  })

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

  const $deleteEntries = createMutation(deleteStorageEntries)
  const $createFolder = createMutation(createStorageFolder)

  const { thumbnails } = useFileExplorerThumbnails({
    endpointId: () => Number.parseInt(params.endpointId as string, 10),

    browserContentsRef: () => browserContentsRef,
    entryRefs: () => entryRefs,

    entries: folderEntries,
  })

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

  const navigateToFolder = (targetFolderId: number) => {
    setSearchParams({ folderId: targetFolderId.toString() })
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
                        {temporarySelectedEntry()!.name}
                      </Text>
                    </Stack>

                    <div class="separator" />

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
                        {temporarySelectedEntry()!.name}
                        {temporarySelectedEntry()!.extension
                          ? `.${temporarySelectedEntry()!.extension!}`
                          : ""}
                      </Text>
                    </Stack>

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
                {(entry, index) => {
                  const selected = createMemo(() =>
                    selectedEntries().has(entry.id)
                  )

                  const temporarySelected = createMemo(
                    () => temporarySelectedEntry()?.id === entry.id
                  )

                  return (
                    <StorageEntry
                      ref={(entryRef: HTMLDivElement) => {
                        entryRefs[index()] = entryRef
                      }}
                      entry={entry}
                      selected={selected()}
                      temporarySelected={temporarySelected()}
                      thumbnails={thumbnails()}
                      onNavigateToFolder={navigateToFolder}
                      onOpenContextMenu={(event) => {
                        setTemporarySelectedEntry(entry)
                        openEntryContextMenu(event)
                      }}
                      onSelect={(event) => {
                        onSelect(index(), event)
                      }}
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
        <div class="side-panel" />
      </div>
    </div>
  )
}

export default FileExplorerPage
