/* eslint-disable unicorn/consistent-function-scoping */
import {
  Component,
  For,
  Match,
  Show,
  Switch,
  createEffect,
  createMemo,
  createSignal,
  on,
  onCleanup,
  onMount,
} from "solid-js"
import { isDev } from "solid-js/web"

import { Checkbox } from "@/app/components/common/checkbox/checkbox"
import { Icon } from "@/app/components/common/icon/icon"
import { isFirefox } from "@/app/core/utils"
import { SelectedEntry } from "@/modules/storage/file-explorer/use-file-explorer"
import { IStorageEntry } from "@/modules/storage/storage-entry/storage-entry.codecs"

import { StorageEntryDragletProps } from "./storage-entry-draglet"

export type StorageEntryProps = {
  ref?: (ref: HTMLDivElement) => void

  dragletRef: HTMLDivElement
  dragletState: StorageEntryDragletProps["state"]

  entry: IStorageEntry

  isSelected?: boolean
  isActive?: boolean
  isContextMenuTarget?: boolean
  thumbnails?: Record<string, string>
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
  let itemInfoRef: HTMLDivElement | undefined
  let nameFieldRef: HTMLInputElement
  let nameFloaterRef: HTMLDivElement | undefined

  const [isAboutToRecieve, setIsAboutToReceive] = createSignal(false)
  const [isDragging, setIsDragging] = createSignal(false)
  const [showNameFloaterOnHover, setShowNameFloaterOnHover] =
    createSignal(false)

  const [currentFrame, setCurrentFrame] = createSignal<number | null>(null)

  // prettier-ignore
  const thumbnail = createMemo(() =>
    (props.entry.entry_type === "file"
      ? props.thumbnails?.[props.entry.id]
      : null)
  )

  const frames = createMemo(() => {
    if (props.entry.entry_type !== "file") return []

    if (props.thumbnails?.[`${props.entry.id}:0`]) {
      const framesArray: string[] = []

      let index = 0

      while (props.thumbnails[`${props.entry.id}:${index}`]) {
        framesArray.push(props.thumbnails[`${props.entry.id}:${index}`]!)
        index++
      }

      return framesArray
    }

    return []
  })

  const fileMimeType = createMemo(() => props.entry.mime_type?.split("/") ?? [])

  const onDragStart = (event: DragEvent) => {
    setIsDragging(true)

    if (!isFirefox) {
      const draggable = document.createElement("div")
      event.dataTransfer?.setDragImage(draggable, 0, 0)

      props.dragletState.entry = props.entry

      props.dragletRef.style.display = "flex"
      props.dragletRef.style.top = `${event.clientY}px`
      props.dragletRef.style.left = `${event.clientX}px`
    }

    event.dataTransfer?.setData(
      "text/plain",
      `${props.entry.entry_type}:${props.entry.id}`
    )
  }

  const onDrag = (event: DragEvent) => {
    props.dragletRef.style.top = `${event.clientY}px`
    props.dragletRef.style.left = `${event.clientX}px`
  }

  const onDragEnd = () => {
    setIsDragging(false)

    if (!isFirefox) {
      props.dragletState.entry = null
      props.dragletRef.style.display = "none"
    }
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
    const keyUpHandler = (event: KeyboardEvent) => {
      if (event.key === "Enter") {
        props.onRename?.(nameFieldRef!.value)
      }

      if (event.key === "Escape") {
        props.onCancelRename?.()
      }
    }

    const blurHandler = () => {
      props.onCancelRename?.()
    }

    nameFieldRef.addEventListener("keyup", keyUpHandler)
    nameFieldRef.addEventListener("blur", blurHandler)

    onCleanup(() => {
      nameFieldRef.removeEventListener("keyup", keyUpHandler)
      nameFieldRef.removeEventListener("blur", blurHandler)
    })
  })

  createEffect(
    on(
      () => props.entry.name,
      () => {
        if (
          nameFloaterRef &&
          itemInfoRef &&
          nameFloaterRef.clientWidth >= itemInfoRef.clientWidth
        ) {
          setShowNameFloaterOnHover(true)
        }
      }
    )
  )

  return (
    // TODO: Should be a clickable <button />
    <div
      ref={props.ref}
      draggable={true}
      onDragStart={onDragStart}
      onDrag={isFirefox ? void 0 : onDrag}
      onDragEnd={onDragEnd}
      onDragLeave={onDragLeave}
      onDragOver={onDragOver}
      onDrop={onDrop}
      classList={{
        item: true,
        selected: props.isSelected,
        active: props.isActive,
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
            value={props.isSelected}
            onChange={(_, event) => {
              props.onSelect!(event)
            }}
            buttonProps={{
              onDblClick: (event) => event.stopPropagation(),
            }}
          />
        </div>
      </Show>
      <div class="item-thumb">
        <Show when={isDev}>
          <div
            style={{
              position: "absolute",
              top: "0.25em",
              right: "0.25em",
              "font-family": "monospace",
              color: "white",
              background: "rgba(2,2,2,0.33)",
              padding: "0.1em 0.25em",
              "border-radius": "0.25em",
              "backdrop-filter": "blur(2px)",
              "font-size": "12px",
            }}
          >
            {props.entry.id}
          </div>
        </Show>
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
        <Show when={frames().length > 0}>
          <For each={frames()}>
            {(frame, index) => (
              <img
                hidden={currentFrame() === null || index() !== currentFrame()}
                draggable={false}
                class="frame"
                src={`data:image/jpeg;base64, ${frame}`}
              />
            )}
          </For>
          <div class="frame-targets" onMouseLeave={[setCurrentFrame, null]}>
            <For each={frames()}>
              {(_, index) => (
                <div class="target" onMouseEnter={[setCurrentFrame, index]} />
              )}
            </For>
          </div>
          <div class="frame-indicators">
            <For each={frames()}>
              {(_, index) => (
                <div
                  classList={{
                    indicator: true,
                    active: index() === currentFrame(),
                  }}
                />
              )}
            </For>
          </div>
        </Show>
      </div>
      <div
        ref={itemInfoRef}
        classList={{
          "item-info": true,
          "show-name-floater": showNameFloaterOnHover(),
        }}
      >
        <div ref={nameFloaterRef} class="item-name-floater">
          <div class="name">
            {`${props.entry.name}${
              props.entry.extension ? `.${props.entry.extension}` : ""
            }`}
          </div>
        </div>
        <div class="item-name">
          <div hidden={props.isRenaming} class="name">
            {props.entry.name}
          </div>
          <Show when={!props.isRenaming && props.entry.extension}>
            <div class="extension">{props.entry.extension}</div>
          </Show>
          {/* <Show when={!props.isRenaming && props.entry.entry_type === "folder"}>
            <div class="icon">
              <Icon
                name="folder_open"
                type="outlined"
                size={16}
                fill={1}
                wght={600}
              />
            </div>
          </Show> */}
          <input
            hidden={!props.isRenaming}
            ref={(ref) => (nameFieldRef = ref)}
            type="text"
            class="name-input"
          />
        </div>
        <div class="item-details">
          <div class="left">
            <Show when={props.entry.entry_type === "folder"}>
              <div class="block">
                <Icon
                  name="folder_open"
                  type="outlined"
                  size={12}
                  fill={1}
                  wght={600}
                />
              </div>
            </Show>
            <Switch>
              <Match when={fileMimeType()[0] === "image"}>
                <div class="block">
                  <Icon
                    name="imagesmode"
                    type="rounded"
                    size={12}
                    fill={1}
                    wght={600}
                  />
                </div>
              </Match>
              <Match when={fileMimeType()[0] === "audio"}>
                <div class="block">
                  <Icon
                    name="music_note"
                    type="rounded"
                    size={12}
                    fill={1}
                    wght={600}
                  />
                </div>
              </Match>
              <Match when={fileMimeType()[0] === "video"}>
                <div class="block">
                  <Icon
                    name="play_arrow"
                    type="rounded"
                    size={12}
                    fill={1}
                    wght={600}
                  />
                </div>
              </Match>
            </Switch>
          </div>
          <div class="right">
            <Show when={props.entry.entry_type === "file"}>
              <div class="block">
                <div class="text">
                  {props.entry.downloads_count === 0
                    ? "-"
                    : props.entry.downloads_count}
                </div>
                <Icon
                  name="arrow_downward"
                  type="sharp"
                  size={12}
                  fill={1}
                  wght={600}
                />
              </div>
            </Show>
          </div>
        </div>
      </div>
    </div>
  )
}
