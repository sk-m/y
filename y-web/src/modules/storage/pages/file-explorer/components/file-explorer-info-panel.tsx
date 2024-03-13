import { Component, Show, createMemo } from "solid-js"

import { format } from "date-fns"

import {
  KeyValue,
  KeyValueFields,
} from "@/app/components/common/key-value/key-value"
import { formatBytes } from "@/app/core/format-utils"
import { IStorageEntry } from "@/modules/storage/storage-entry/storage-entry.codecs"

import "./file-explorer-info-panel.less"

export type FileExplorerInfoPanelProps = {
  entry: IStorageEntry
  thumbnails?: Record<number, string>

  onRename?: (newName: string) => void
  onThumbnailClick?: () => void
}

export const FileExplorerInfoPanel: Component<FileExplorerInfoPanelProps> = (
  props
) => {
  // prettier-ignore
  const thumbnail = createMemo(() =>
    (props.entry.entry_type === "file"
      ? props.thumbnails?.[props.entry.id]
      : null)
  )

  return (
    <div class="file-explorer-info-panel">
      <Show when={thumbnail()}>
        <div
          class="thumbnail-container"
          onClick={() => {
            props.onThumbnailClick?.()
          }}
        >
          <img
            draggable={false}
            class="thumbnail"
            src={`data:image/jpeg;base64, ${thumbnail() ?? ""}`}
          />
        </div>
      </Show>

      <div class="key-values">
        <KeyValueFields>
          <KeyValue
            direction="column"
            label="Name"
            value={props.entry.name}
            onChange={(value) => props.onRename?.(value)}
          />
          <Show when={props.entry.mime_type}>
            <KeyValue
              direction="column"
              label="MIME Type"
              readonly
              value={props.entry.mime_type}
              onChange={() => void 0}
            />
          </Show>
          <Show when={props.entry.size_bytes}>
            <KeyValue
              direction="column"
              label="Size"
              readonly
              value={formatBytes(props.entry.size_bytes!)}
              onChange={() => void 0}
            />
          </Show>
          <Show when={props.entry.created_at}>
            <KeyValue
              direction="column"
              label="Created at"
              readonly
              value={props.entry.created_at}
              getValueString={(value) =>
                format(new Date(value!), "dd.MM.yyyy HH:mm")
              }
              onChange={() => void 0}
            />
          </Show>
        </KeyValueFields>
      </div>
    </div>
  )
}
