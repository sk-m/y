/* eslint-disable @typescript-eslint/no-magic-numbers */
import { Component } from "solid-js"
import { Portal } from "solid-js/web"

import { Icon } from "@/app/components/common/icon/icon"

import "./file-explorer-upload-status-toast.less"

const BYTES_PER_MB = 1_000_000

export type FileExplorerUploadStatusToastProps = {
  numberOfFiles: number
  percentageUploaded: number
  totalSizeBytes: number
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
          <div class="text">
            <div class="heading">Uploading {props.numberOfFiles} files...</div>
            <div class="details">
              {(
                (props.totalSizeBytes * props.percentageUploaded) /
                BYTES_PER_MB
              ).toFixed(0)}
              /{(props.totalSizeBytes / BYTES_PER_MB).toFixed(0)} MB
            </div>
          </div>
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
