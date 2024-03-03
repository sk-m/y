import { Component, Show, createMemo } from "solid-js"

import { Checkbox } from "@/app/components/common/checkbox/checkbox"
import { Icon } from "@/app/components/common/icon/icon"
import { IStorageEntry } from "@/modules/storage/storage-entry/storage-entry.codecs"

export type StorageEntryProps = {
  ref?: (ref: HTMLDivElement) => void

  entry: IStorageEntry

  selected?: boolean
  temporarySelected?: boolean
  thumbnails?: Record<number, string>

  onNavigateToFolder: (folderId: number) => void
  onOpenContextMenu?: (event: MouseEvent) => void
  onSelect?: (event: MouseEvent | undefined) => void
}

export const StorageEntry: Component<StorageEntryProps> = (props) => {
  const thumbnail = createMemo(() => props.thumbnails?.[props.entry.id])

  return (
    // TODO: Should be a clickable <button />
    <div
      ref={props.ref}
      classList={{
        item: true,
        selected: props.selected,
        "temporary-selected": props.temporarySelected,
      }}
      onClick={() =>
        props.entry.entry_type === "folder" &&
        props.onNavigateToFolder(props.entry.id)
      }
      onContextMenu={(event) => {
        event.preventDefault()
        event.stopPropagation()
        event.stopImmediatePropagation()

        props.onOpenContextMenu?.(event)
      }}
    >
      <Show when={props.onSelect}>
        <div class="item-select-container">
          <Checkbox
            size="m"
            value={props.selected}
            onChange={(_, event) => {
              props.onSelect!(event)
            }}
          />
        </div>
      </Show>
      <div class="item-thumb">
        <Show
          when={thumbnail()}
          fallback={
            <div class="icon">
              <Icon
                name={
                  props.entry.entry_type === "folder" ? "folder_open" : "draft"
                }
                type="outlined"
                fill={1}
                wght={500}
                size={40}
              />
            </div>
          }
        >
          <img
            draggable={false}
            class="thumbnail"
            src={`data:image/jpeg;base64, ${thumbnail() ?? ""}`}
          />
        </Show>
      </div>
      <div class="item-info">
        <div
          class="item-name"
          title={`${props.entry.name}${
            props.entry.extension ? `.${props.entry.extension}` : ""
          }`}
        >
          <div class="name">{props.entry.name}</div>
          <Show when={props.entry.extension}>
            <div class="extension">{props.entry.extension}</div>
          </Show>
        </div>
      </div>
    </div>
  )
}
