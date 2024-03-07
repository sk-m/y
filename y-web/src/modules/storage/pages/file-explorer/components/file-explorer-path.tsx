import { Component, Index } from "solid-js"

import { Icon } from "@/app/components/common/icon/icon"

import "./file-explorer-path.less"

export type PathSegment = {
  id: number | string
  name: string
}

export type FileExplorerPathProps = {
  path: PathSegment[]

  onNavigate?: (folderId: number | string | null) => void
}

export const FileExplorerPath: Component<FileExplorerPathProps> = (props) => {
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
        <button class="path-segment" onClick={() => props.onNavigate?.(null)}>
          /
        </button>
        <Index each={props.path}>
          {(segment) => (
            <button
              class="path-segment"
              onClick={() => props.onNavigate?.(segment().id)}
            >
              {segment().name} /
            </button>
          )}
        </Index>
      </div>
    </div>
  )
}
