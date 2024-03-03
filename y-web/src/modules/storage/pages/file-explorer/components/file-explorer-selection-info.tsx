/* eslint-disable solid/reactivity */
import { Component } from "solid-js"

import { Icon } from "@/app/components/common/icon/icon"

import "./file-explorer-selection-info.less"

export type FileExplorerSelectionInfoProps = {
  selectedEntriesCount: number
  onClick: (event: MouseEvent) => void
}

export const FileExplorerSelectionInfo: Component<
  FileExplorerSelectionInfoProps
> = (props) => {
  return (
    <div class="file-explorer-selection-info">
      <button class="info-container" onClick={props.onClick}>
        <div class="selected-entries-count">
          {props.selectedEntriesCount} selected
        </div>
        <Icon name="expand_more" size={14} wght={500} />
      </button>
    </div>
  )
}
