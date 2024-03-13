/* eslint-disable unicorn/consistent-function-scoping */
import { createSignal } from "solid-js"

import { FileWithPath, retrieveFiles } from "@/modules/storage/upload"

export type DropHandler = (files: FileWithPath[], event?: DragEvent) => void

export const useFilesDrop = () => {
  const [isAboutToDrop, setIsAboutToDrop] = createSignal(false)

  const onDragOver = (event: DragEvent) => {
    event.preventDefault()
  }

  const onDragEnter = (event: DragEvent) => {
    event.preventDefault()

    if (
      !event.dataTransfer?.items ||
      event.dataTransfer.items[0]?.kind !== "file"
    )
      return

    setIsAboutToDrop(true)
  }

  const onDragLeave = (event: DragEvent) => {
    event.preventDefault()

    setIsAboutToDrop(false)
  }

  const onDrop = async (event: DragEvent, dropHandler: DropHandler) => {
    event.preventDefault()

    if (
      !event.dataTransfer?.items ||
      event.dataTransfer.items[0]?.kind !== "file"
    )
      return

    setIsAboutToDrop(false)

    const promises = []
    const files: FileWithPath[] = []

    for (const item of event.dataTransfer.items) {
      if (item.kind === "file") {
        const entry = item.webkitGetAsEntry()

        if (entry) promises.push(retrieveFiles(entry, files))
      }
    }

    await Promise.all(promises)

    // TODO This is slow and should really be done on the server side.
    const processedFiles = files.flat(1).sort((a, b) => {
      const aParts = a.path.split("/").length
      const bParts = b.path.split("/").length

      return aParts > bParts ? 1 : -1
    })

    dropHandler(processedFiles, event)
  }

  return {
    onDragOver,
    onDragEnter,
    onDragLeave,
    isAboutToDrop,
    onDrop: (dropHandler: DropHandler) => (event: DragEvent) => {
      void onDrop(event, dropHandler)
    },
  }
}
