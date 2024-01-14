/* eslint-disable unicorn/consistent-function-scoping */
import { Component } from "solid-js"

import { Icon } from "@/app/components/common/icon/icon"
import { post } from "@/app/core/request"

import { retrieveFiles } from "../../upload"
import "./file-explorer.less"

const FileExplorerPage: Component = () => {
  const onDrop = async (event: DragEvent) => {
    event.preventDefault()

    if (!event.dataTransfer) return

    const promises = []

    for (const item of event.dataTransfer.items) {
      if (item.kind === "file") {
        const entry = item.webkitGetAsEntry()

        if (entry) promises.push(retrieveFiles(entry, []))
      }
    }

    const files = await Promise.all(promises)
    const filesToUpload = files.flat(1)

    const data = new FormData()

    let index = 0
    for (const file of filesToUpload) {
      data.append(`file_${index}`, file)

      index++
    }

    post("/storage/upload", {
      rawBody: data,
      contentType: "multipart/form-data",
    })
      .then((resp) => console.log(resp))
      .catch((error) => console.error(error))

    console.log(filesToUpload)
  }

  const onDragOver = (event: DragEvent) => {
    event.preventDefault()
  }

  const onDragLeave = (event: DragEvent) => {
    event.preventDefault()
  }

  return (
    <div
      id="page-storage-file-explorer"
      onDrop={(event) => void onDrop(event)}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
    >
      <div class="page-container">
        <div class="browser-container">
          <div class="browser-contents">
            <div class="items">
              <div class="item">
                <div class="item-thumb">
                  <div class="icon">
                    <Icon
                      name="movie"
                      type="outlined"
                      fill={1}
                      wght={500}
                      size={40}
                    />
                  </div>
                </div>
                <div class="item-info">
                  <div class="item-name">
                    <div class="name">Example</div>
                    <div class="extension">.mov</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="side-panel" />
      </div>
    </div>
  )
}

export default FileExplorerPage
