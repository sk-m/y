/* eslint-disable unicorn/consistent-function-scoping */
import {
  Component,
  Show,
  createEffect,
  createMemo,
  createSignal,
  onCleanup,
  onMount,
} from "solid-js"

import { Checkbox } from "@/app/components/common/checkbox/checkbox"
import { Icon } from "@/app/components/common/icon/icon"
import { SelectedEntry } from "@/modules/storage/file-explorer/use-file-explorer"
import { IStorageEntry } from "@/modules/storage/storage-entry/storage-entry.codecs"

export type StorageEntryProps = {
  ref?: (ref: HTMLDivElement) => void

  entry: IStorageEntry

  selected?: boolean
  isContextMenuTarget?: boolean
  thumbnails?: Record<number, string>
  isRenaming?: boolean

  onDblClick: (event: MouseEvent) => void
  onOpenContextMenu?: (event: MouseEvent) => void
  onSelect?: (event: MouseEvent | undefined) => void
  onRename?: (newName: string) => void
  onMove?: (sourceEntrySignature: SelectedEntry, targetEntryId: number) => void
  onClick?: (event: MouseEvent) => void
  onCancelRename?: () => void
}

export const StorageEntry: Component<StorageEntryProps> = (props) => {
  let nameFieldRef: HTMLInputElement

  const [isAboutToRecieve, setIsAboutToReceive] = createSignal(false)
  const [isDragging, setIsDragging] = createSignal(false)

  // prettier-ignore
  const thumbnail = createMemo(() =>
    (props.entry.entry_type === "file"
      ? props.thumbnails?.[props.entry.id]
      : null)
  )

  const onDragStart = (event: DragEvent) => {
    setIsDragging(true)

    event.dataTransfer?.setData(
      "text/plain",
      `${props.entry.entry_type}:${props.entry.id}`
    )
  }

  const onDragEnd = () => {
    setIsDragging(false)
  }

  const onDragOver = (event: DragEvent) => {
    event.preventDefault()

    if (props.entry.entry_type === "folder") {
      setIsAboutToReceive(true)
    }
  }

  const onDragLeave = (event: DragEvent) => {
    event.preventDefault()

    setIsAboutToReceive(false)
  }

  const onDrop = (event: DragEvent) => {
    event.preventDefault()

    if (props.entry.entry_type !== "folder") return

    setIsAboutToReceive(false)

    const droppedEntrySignature = event.dataTransfer?.getData("text/plain") as
      | SelectedEntry
      | undefined

    if (!droppedEntrySignature) return

    const [, droppedEntryId] = droppedEntrySignature.split(":")

    if (droppedEntryId === props.entry.id.toString()) return

    props.onMove?.(droppedEntrySignature, props.entry.id)
  }

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
      draggable={true}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragLeave={onDragLeave}
      onDragOver={onDragOver}
      onDrop={onDrop}
      classList={{
        item: true,
        selected: props.selected,
        "context-menu-target": props.isContextMenuTarget,
        "about-to-receive": isAboutToRecieve(),
        dragging: isDragging(),
      }}
      onDblClick={(event) => props.onDblClick(event)}
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
      <div class="item-drop-here-hint">
        <Icon name="place_item" wght={600} size={32} />
        <div class="folder-name">{props.entry.name}</div>
      </div>
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
          <Show when={!props.isRenaming && props.entry.entry_type === "folder"}>
            <div class="icon">
              <Icon
                name="folder_open"
                type="outlined"
                size={16}
                fill={1}
                wght={600}
              />
            </div>
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
