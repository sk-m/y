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
  onMount,
} from "solid-js"
import { createStore } from "solid-js/store"

import { useParams, useSearchParams } from "@solidjs/router"
import { createMutation, useQueryClient } from "@tanstack/solid-query"

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

import {
  createStorageFolder,
  deleteStorageEntries,
  downloadStorageFile,
} from "../../storage-entry/storage-entry.api"
import { IStorageEntry } from "../../storage-entry/storage-entry.codecs"
import {
  storageEntriesKey,
  useStorageEntries,
  useStorageFolderPath,
} from "../../storage-entry/storage-entry.service"
import { retrieveFiles } from "../../upload"
import { FileExplorerPath } from "./components/file-explorer-path"
import { FileExplorerUploadStatusToast } from "./components/file-explorer-upload-status-toast"
import "./file-explorer.less"

const closeTabConfirmation = (event: BeforeUnloadEvent) => {
  event.preventDefault()
  event.returnValue = ""
}

const FileExplorerPage: Component = () => {
  const { notify } = toastCtl
  const params = useParams()
  const queryClient = useQueryClient()
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

  let newFolderNameInputRef: HTMLInputElement | undefined

  const [uploadStatus, setUploadStatus] = createStore({
    numberOfFiles: 0,
    percentageUploaded: 0,
    totalSizeBytes: 0,
  })

  const [folderCreationInitiated, setFolderCreationInitiated] =
    createSignal(false)

  const [temporarySelectedEntry, setTemporarySelectedEntry] =
    createSignal<IStorageEntry | null>(null)

  const [searchParams, setSearchParams] = useSearchParams()

  const $createFolder = createMutation(createStorageFolder)
  const $deleteEntries = createMutation(deleteStorageEntries)

  const $folderEntries = useStorageEntries(() => ({
    folderId: searchParams.folderId,
    endpointId: params.endpointId as string,
  }))

  const $folderPath = useStorageFolderPath(() => ({
    folderId: searchParams.folderId,
    endpointId: params.endpointId as string,
  }))

  const folderPath = createMemo(() => $folderPath.data?.folder_path ?? [])
  const folderEntries = createMemo(() => $folderEntries.data?.entries ?? [])

  const invalidateEntries = async () => {
    return queryClient.invalidateQueries([
      storageEntriesKey,
      params.endpointId,
      searchParams.folderId,
    ])
  }

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

          newFolderNameInputRef!.value = ""

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
          void invalidateEntries()
        },
        onError: (error) => genericErrorToast(error),
      }
    )
  }

  onMount(() => {
    if (newFolderNameInputRef) {
      newFolderNameInputRef.addEventListener("keyup", (event) => {
        if (event.key === "Enter") {
          createFolder(newFolderNameInputRef!.value)
        }
      })
    }
  })

  createEffect(() => {
    if (uploadStatus.numberOfFiles === 0) {
      window.removeEventListener("beforeunload", closeTabConfirmation)
    } else {
      window.addEventListener("beforeunload", closeTabConfirmation)
    }
  })

  const onDrop = async (event: DragEvent) => {
    event.preventDefault()

    if (!event.dataTransfer) return

    const promises = []

    for (const item of event.dataTransfer.items) {
      if (item.kind === "file") {
        const entry = item.webkitGetAsEntry()

        if (entry) promises.push(retrieveFiles(entry, []))
      }
    }

    const files = await Promise.all(promises)

    // TODO This is slow and should really be done on the server side.
    const filesToUpload = files.flat(1).sort((a, b) => {
      const aParts = a.path.split("/").length
      const bParts = b.path.split("/").length

      return aParts > bParts ? 1 : -1
    })

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
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const json: {
        error?: {
          code?: string
        }
        // eslint-disable-next-line @typescript-eslint/naming-convention
        skipped_files: string[]
      } = JSON.parse(
        (loadendEvent.target as { responseText?: string }).responseText ?? ""
      )

      if (json.error) {
        genericErrorToast(json.error)
      }

      if (json.skipped_files.length > 0) {
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

  const onDragOver = (event: DragEvent) => {
    event.preventDefault()
  }

  const onDragLeave = (event: DragEvent) => {
    event.preventDefault()
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

  return (
    <div
      id="page-storage-file-explorer"
      onDrop={(event) => void onDrop(event)}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
    >
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
                    newFolderNameInputRef?.focus()

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
              <ContextMenuSection>
                <Show when={temporarySelectedEntry()?.entry_type === "folder"}>
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
            </ContextMenu>
            <div class="items">
              {/* TODO: Maybe use Index instaed of For? */}
              <For each={folderEntries()}>
                {(entry) => (
                  // TODO: Should be a clickable button
                  <div
                    class="item"
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
                )}
              </For>
              <div class="item" hidden={!folderCreationInitiated()}>
                <div class="item-thumb">
                  <div class="icon">
                    <Icon
                      name={"create_new_folder"}
                      type="outlined"
                      fill={1}
                      wght={500}
                      size={40}
                    />
                  </div>
                </div>
                <div class="item-info">
                  <div class="item-name">
                    <input
                      ref={(ref) => (newFolderNameInputRef = ref)}
                      type="text"
                      class="name-input"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="side-panel" />
      </div>
    </div>
  )
}

export default FileExplorerPage
