import {
  Component,
  For,
  Show,
  createEffect,
  createMemo,
  createSignal,
} from "solid-js"

import { formatDistance } from "date-fns"

import { Button } from "@/app/components/common/button/button"
import { Icon } from "@/app/components/common/icon/icon"
import { formatBytes } from "@/app/core/format-utils"

import { downloadStorageUserArchive } from "../../storage-user-archive/storage-user-archive.api"
import { IStorageUserArchive } from "../../storage-user-archive/storage-user-archive.codecs"

const download = (archive: IStorageUserArchive) => {
  downloadStorageUserArchive({
    archiveId: archive.id,
    fileName: `download-${archive.id}.zip`,
  })
}

export type StorageUserArchivesProps = {
  userArchives: IStorageUserArchive[]
}

export const StorageUserArchives: Component<StorageUserArchivesProps> = (
  props
) => {
  const isClosed =
    localStorage.getItem("y_storage_files_explorer_archives_expanded") ===
    "false"

  const [expanded, setExpanded] = createSignal(!isClosed)

  const toggleExpanded = () => setExpanded(!expanded())

  createEffect(() => {
    localStorage.setItem(
      "y_storage_files_explorer_archives_expanded",
      expanded().toString()
    )
  })

  const userArchivesSorted = createMemo(() =>
    props.userArchives.sort(
      (a, b) =>
        new Date(b.created_at!).getTime() - new Date(a.created_at!).getTime()
    )
  )

  return (
    <div class="storage-layout-archives-container">
      <div class="title">
        <div class="text">Your archives</div>
        <div class="buttons">
          <button onClick={toggleExpanded}>
            <Icon
              name={expanded() ? "expand_more" : "expand_less"}
              fill={1}
              type="rounded"
              size={16}
              wght={500}
            />
          </button>
        </div>
      </div>
      <Show when={expanded()}>
        <div class="storage-layout-archives">
          <For each={userArchivesSorted()}>
            {(archive) => (
              <div class="archive">
                <div class="left">
                  <div class="title">
                    <Icon
                      name="folder_zip"
                      fill={1}
                      type="rounded"
                      size={16}
                      wght={500}
                    />
                    <div>{archive.target_entries_ids.length} entries</div>
                  </div>
                  <div class="details">
                    <div class="created-at">
                      {formatDistance(
                        new Date(archive.created_at!),
                        new Date(),
                        { addSuffix: true, includeSeconds: true }
                      )}
                    </div>
                    <Show when={archive.size_bytes}>
                      <div class="size">{formatBytes(archive.size_bytes!)}</div>
                    </Show>
                  </div>
                </div>
                <div class="right">
                  <div classList={{ status: true, ready: archive.ready }}>
                    <div>{archive.ready ? "ready" : "packing..."}</div>
                    <div class="circle" />
                  </div>
                  <div class="buttons">
                    <Button
                      leadingIcon="download"
                      size="xs-squared"
                      variant="text"
                      onClick={() => download(archive)}
                    />
                  </div>
                </div>
              </div>
            )}
          </For>
        </div>
      </Show>
    </div>
  )
}
