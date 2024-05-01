import { Component } from "solid-js"

import { Icon } from "@/app/components/common/icon/icon"
import { globalUploadProgressCtl } from "@/app/storage/global-upload-progress"

import "./aside-storage-upload-progress.less"

const BYTES_PER_MB = 1_000_000

export const AsideStorageUploadProgress: Component = () => {
  const { status } = globalUploadProgressCtl

  return (
    <div
      classList={{
        "ui-aside-storage-upload-progress": true,
        show: status.numberOfFiles > 0,
      }}
    >
      <div
        classList={{
          "upload-complete": true,
          show: status.percentageUploaded === 1,
        }}
      >
        {/* <div class="bkg-bar-animation" /> */}

        <Icon name="cached" wght={600} size={18} fill={1} />
        <div class="text">Processing...</div>
      </div>
      <div class="text">
        <div class="heading">Uploading {status.numberOfFiles} files...</div>
        <div class="details">
          {(
            (status.totalSizeBytes * status.percentageUploaded) /
            BYTES_PER_MB
          ).toFixed(0)}
          /{(status.totalSizeBytes / BYTES_PER_MB).toFixed(0)} MB
        </div>
      </div>
      <div class="progress-container">
        <div class="progress-bar">
          <div
            class="progress-inner"
            style={{
              // eslint-disable-next-line @typescript-eslint/no-magic-numbers
              width: `${status.percentageUploaded * 100}%`,
            }}
          />
        </div>
      </div>
    </div>
  )
}
