import { Component } from "solid-js"
import { Portal } from "solid-js/web"

import { Icon } from "@/app/components/common/icon/icon"

import "./file-explorer-upload-status-toast.less"

export type FileExplorerUploadStatusToastProps = {
  numberOfFiles: number
  percentageUploaded: number
}

export const FileExplorerUploadStatusToast: Component<
  FileExplorerUploadStatusToastProps
> = (props) => {
  return (
    <Portal mount={document.getElementById("app-toasts-container")!}>
      <div class="file-explorer-upload-status-toast">
        <div class="icon">
          <Icon name="cloud_upload" wght={500} size={18} fill={1} />
        </div>
        <div class="content">
          <div class="text">Uploading {props.numberOfFiles} files...</div>
          <div class="progress-container">
            <div class="progress-bar">
              <div
                class="progress-inner"
                style={{
                  // eslint-disable-next-line @typescript-eslint/no-magic-numbers
                  width: `${props.percentageUploaded * 100}%`,
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </Portal>
  )
}
