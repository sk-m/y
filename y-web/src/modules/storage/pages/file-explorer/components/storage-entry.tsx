import {
  Component,
  Show,
  createEffect,
  createMemo,
  onCleanup,
  onMount,
} from "solid-js"

import { Checkbox } from "@/app/components/common/checkbox/checkbox"
import { Icon } from "@/app/components/common/icon/icon"
import { IStorageEntry } from "@/modules/storage/storage-entry/storage-entry.codecs"

export type StorageEntryProps = {
  ref?: (ref: HTMLDivElement) => void

  entry: IStorageEntry

  selected?: boolean
  isContextMenuTarget?: boolean
  thumbnails?: Record<number, string>
  isRenaming?: boolean

  onNavigateToFolder: (folderId: number) => void
  onOpenContextMenu?: (event: MouseEvent) => void
  onSelect?: (event: MouseEvent | undefined) => void
  onRename?: (newName: string) => void
  onClick?: (event: MouseEvent) => void
  onCancelRename?: () => void
}

export const StorageEntry: Component<StorageEntryProps> = (props) => {
  let nameFieldRef: HTMLInputElement

  // prettier-ignore
  const thumbnail = createMemo(() =>
    (props.entry.entry_type === "file"
      ? props.thumbnails?.[props.entry.id]
      : null)
  )

  createEffect(() => {
    if (props.isRenaming) {
      nameFieldRef.value = props.entry.name
      nameFieldRef.select()
    }
  })

  onMount(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Enter") {
        props.onRename?.(nameFieldRef!.value)
      }

      if (event.key === "Escape") {
        props.onCancelRename?.()
      }
    }

    nameFieldRef.addEventListener("keyup", handler)

    onCleanup(() => {
      nameFieldRef.removeEventListener("keyup", handler)
    })
  })

  return (
    // TODO: Should be a clickable <button />
    <div
      ref={props.ref}
      classList={{
        item: true,
        selected: props.selected,
        "context-menu-target": props.isContextMenuTarget,
      }}
      onDblClick={() =>
        props.entry.entry_type === "folder" &&
        !props.isRenaming &&
        props.onNavigateToFolder(props.entry.id)
      }
      // prettier-ignore
      onClick={(event) =>
        props.onClick?.(event)
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
          title={
            props.isRenaming
              ? // eslint-disable-next-line no-undefined
                undefined
              : `${props.entry.name}${
                  props.entry.extension ? `.${props.entry.extension}` : ""
                }`
          }
        >
          <div hidden={props.isRenaming} class="name">
            {props.entry.name}
          </div>
          <Show when={!props.isRenaming && props.entry.extension}>
            <div class="extension">{props.entry.extension}</div>
          </Show>
          <input
            hidden={!props.isRenaming}
            ref={(ref) => (nameFieldRef = ref)}
            type="text"
            class="name-input"
          />
        </div>
      </div>
    </div>
  )
}
