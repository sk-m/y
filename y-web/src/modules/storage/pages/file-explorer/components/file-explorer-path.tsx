import { Component, Index, createSelector, createSignal } from "solid-js"

import { Icon } from "@/app/components/common/icon/icon"
import { SelectedEntry } from "@/modules/storage/file-explorer/use-file-explorer"

import "./file-explorer-path.less"

export type PathSegment = {
  id: number
  name: string
}

export type FileExplorerPathProps = {
  path: PathSegment[]

  onNavigate?: (folderId: number | string | null) => void
  onMove?: (
    sourceEntrySignature: SelectedEntry,
    targetEntryId: number | null
  ) => void
}

export const FileExplorerPath: Component<FileExplorerPathProps> = (props) => {
  const [dropReceiverSegmentId, setDropReceiverSegmentId] = createSignal<
    number | null
  >(null)

  const isReceiver = createSelector(dropReceiverSegmentId)

  const onDragOver = (event: DragEvent, segmentId: number) => {
    event.preventDefault()

    setDropReceiverSegmentId(segmentId)
  }

  const onDragLeave = (event: DragEvent) => {
    event.preventDefault()

    setDropReceiverSegmentId(null)
  }

  const onDrop = (event: DragEvent, targetFolderId: number | null) => {
    event.preventDefault()

    setDropReceiverSegmentId(null)

    const droppedEntrySignature = event.dataTransfer?.getData("text/plain") as
      | SelectedEntry
      | undefined

    if (!droppedEntrySignature) return

    props.onMove?.(droppedEntrySignature, targetFolderId)
  }

  const goBack = () => {
    if (!props.onNavigate) return

    // eslint-disable-next-line @typescript-eslint/no-magic-numbers
    if (props.path.length < 2) {
      props.onNavigate(null)
    } else {
      // eslint-disable-next-line unicorn/prefer-at, @typescript-eslint/no-magic-numbers
      props.onNavigate(props.path[props.path.length - 2]!.id)
    }
  }

  return (
    <div class="file-explorer-path-container">
      <button class="back-button" onClick={goBack}>
        <Icon name="reply" size={14} wght={500} />
        {/* <div class="text">back</div> */}
      </button>
      <div class="top-container-separator" />
      <div class="path-segments">
        <button
          classList={{
            "path-segment": true,
            "about-to-receive": isReceiver(-1),
          }}
          onClick={() => props.onNavigate?.(null)}
          onDragOver={(event) => onDragOver(event, -1)}
          onDragLeave={onDragLeave}
          onDrop={(event) => onDrop(event, null)}
        >
          /
        </button>
        <Index each={props.path}>
          {(segment) => (
            <button
              classList={{
                "path-segment": true,
                "about-to-receive": isReceiver(segment().id),
              }}
              onClick={() => props.onNavigate?.(segment().id)}
              onDragOver={(event) => onDragOver(event, segment().id)}
              onDragLeave={onDragLeave}
              onDrop={(event) => onDrop(event, segment().id)}
            >
              {segment().name} /
            </button>
          )}
        </Index>
      </div>
    </div>
  )
}
