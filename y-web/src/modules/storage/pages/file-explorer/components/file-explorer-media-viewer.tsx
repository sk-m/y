/* eslint-disable solid/reactivity */
import {
  Component,
  Match,
  Switch,
  createEffect,
  createMemo,
  createSignal,
  on,
  onCleanup,
  onMount,
} from "solid-js"
import { Portal } from "solid-js/web"

import { Icon } from "@/app/components/common/icon/icon"
import { apiStorageEntries } from "@/modules/storage/storage-entry/storage-entry.api"
import { IStorageEntry } from "@/modules/storage/storage-entry/storage-entry.codecs"

import "./file-explorer-media-viewer.less"

const ZOOM_STEP = 0.25

export type FileExplorerMediaViewerProps = {
  endpointId: string
  entry: IStorageEntry

  onPrev: () => void
  onNext: () => void

  onInfoPanelSelect: () => void
  onSelect: () => void
  onDelete: () => void
  onDownload: () => void

  onClose: () => void
}

export const FileExplorerMediaViewer: Component<
  FileExplorerMediaViewerProps
> = (props) => {
  const [zoom, setZoom] = createSignal(1)
  const [showZoomHint, setShowZoomHint] = createSignal(false)

  const previewUrl = createMemo(() => {
    return `/api${apiStorageEntries}/${props.endpointId}/get/${props.entry.id}`
  })

  createEffect(
    on(
      () => props.entry,
      () => setZoom(1)
    )
  )

  const keyupHandler = (event: KeyboardEvent) => {
    event.stopPropagation()
    event.stopImmediatePropagation()

    if (event.key === "Shift") {
      setShowZoomHint(false)
    }
  }

  const keydownHandler = (event: KeyboardEvent) => {
    event.stopPropagation()
    event.stopImmediatePropagation()

    if (event.key === "Shift") {
      setShowZoomHint(true)
    }

    if (event.key === "Escape") {
      event.preventDefault()

      props.onClose()
    }

    if (event.key === "Enter") {
      event.preventDefault()

      props.onInfoPanelSelect()
      props.onClose()
    }

    if (event.key === " ") {
      event.preventDefault()

      props.onSelect()
    }

    if (event.key === "ArrowLeft") {
      event.preventDefault()

      props.onPrev()
    }

    if (event.key === "ArrowRight") {
      event.preventDefault()

      props.onNext()
    }

    if (event.key === "s" && event.ctrlKey) {
      event.preventDefault()

      props.onDownload()
    }

    if (event.key === "Delete" && event.shiftKey) {
      event.preventDefault()

      props.onDelete()
    }
  }

  const scrollHandler = (event: MouseEvent & { deltaY: number }) => {
    if (event.shiftKey) {
      if (event.deltaY > 0) {
        // prettier-ignore
        setZoom((previous) => previous - (ZOOM_STEP * previous))
      } else {
        // prettier-ignore
        setZoom((previous) => previous + (ZOOM_STEP * previous))
      }
    } else {
      if (event.deltaY > 0) {
        props.onNext()
      } else {
        props.onPrev()
      }
    }
  }

  const mouseHandler = (event: MouseEvent) => {
    // Middle mouse button - reset zoom
    if (event.button === 1) {
      event.preventDefault()
      setZoom(1)
    }
  }

  // eslint-disable-next-line sonarjs/cognitive-complexity
  onMount(() => {
    document.addEventListener("keydown", keydownHandler)
    document.addEventListener("keyup", keyupHandler)
    document.addEventListener("wheel", scrollHandler)
    document.addEventListener("pointerdown", mouseHandler)

    onCleanup(() => {
      document.removeEventListener("keydown", keydownHandler)
      document.removeEventListener("keyup", keyupHandler)
      document.removeEventListener("wheel", scrollHandler)
      document.removeEventListener("pointerdown", mouseHandler)
    })
  })

  return (
    <Portal mount={document.getElementById("root")!}>
      <div id="file-explorer-media-viewer-container">
        <div class="top-container">
          <div class="left">
            <div class="container-block">
              <button class="button" onClick={props.onDelete}>
                <Icon name="delete" wght={500} size={20} />
              </button>
            </div>
          </div>
          <div class="middle">
            <div class="file-name">
              {props.entry.name}
              {props.entry.extension ? `.${props.entry.extension}` : ""}
            </div>
          </div>
          <div class="right">
            <div class="container-block">
              <button class="button" onClick={props.onDownload}>
                <Icon name="download" wght={500} size={20} />
              </button>
            </div>
            <div class="container-block">
              <button class="button" onClick={props.onClose}>
                <Icon name="close" wght={500} size={20} />
              </button>
            </div>
          </div>
        </div>
        <div class="main-container">
          <div class="left">
            <button class="navigation-button" onClick={props.onPrev}>
              <Icon name="chevron_left" wght={500} size={20} />
            </button>
          </div>
          <div class="middle" onClick={() => props.onClose()}>
            <Switch
              fallback={
                <div class="not-available-text">
                  preview is not available for this file type :(
                </div>
              }
            >
              <Match when={props.entry.mime_type?.startsWith("image/")}>
                <img
                  onClick={(event) => event.stopPropagation()}
                  class="preview-image"
                  src={previewUrl()}
                  alt="Image preview"
                  draggable={false}
                  style={{ transform: `scale(${zoom()})` }}
                />
              </Match>
              <Match when={props.entry.mime_type?.startsWith("video/")}>
                <video
                  class="preview-video"
                  src={previewUrl()}
                  controls
                  autoplay
                  onClick={(event) => event.stopPropagation()}
                  draggable={false}
                  style={{ transform: `scale(${zoom()})` }}
                />
              </Match>
            </Switch>
          </div>
          <div class="right">
            <button class="navigation-button" onClick={props.onNext}>
              <Icon name="chevron_right" wght={500} size={20} />
            </button>
          </div>
        </div>
        <div class="bottom-container" />
        <div class="hints-container">
          <div
            classList={{ hint: true, "zoom-hint": true, show: showZoomHint() }}
          >
            {/* eslint-disable-next-line @typescript-eslint/no-magic-numbers */}
            {Math.floor(zoom() * 100)}%
          </div>
        </div>
      </div>
    </Portal>
  )
}