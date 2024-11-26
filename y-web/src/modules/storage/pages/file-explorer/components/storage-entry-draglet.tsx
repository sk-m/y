import { Component } from "solid-js"
import { Portal } from "solid-js/web"

import { Icon } from "@/app/components/common/icon/icon"
import { IStorageEntry } from "@/modules/storage/storage-entry/storage-entry.codecs"

import "./storage-entry-draglet.less"

export type StorageEntryDragletProps = {
  ref: HTMLDivElement

  state: {
    entry: IStorageEntry | null
    selectedEntriesCount: number
  }
}

export const StorageEntryDraglet: Component<StorageEntryDragletProps> = (
  props
) => {
  return (
    <Portal>
      <div ref={props.ref} class="storage-entry-draglet">
        <div class="entry-name">
          <div class="icon">
            <Icon
              wght={600}
              type="rounded"
              size={16}
              fill={1}
              name={
                props.state.entry?.entry_type === "file"
                  ? "description"
                  : "folder_open"
              }
            />
          </div>
          <div class="name">
            {props.state.entry?.name}
            {props.state.selectedEntriesCount > 1
              ? ` and ${props.state.selectedEntriesCount - 1} other`
              : ""}
          </div>
        </div>
      </div>
    </Portal>
  )
}
