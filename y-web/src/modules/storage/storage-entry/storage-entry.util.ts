import download from "downloadjs"

import { toastCtl } from "@/app/core/toast"

export const downloadResponseBlob = async (response: Response) => {
  if (!response.ok) {
    const { notify } = toastCtl

    notify({
      title: "Download failed",
      content: "Failed to download file",
      severity: "error",
      icon: "error",
    })

    return
  }

  const blob = await response.blob()
  const contentDispositionHeader = response.headers.get("Content-Disposition")

  if (contentDispositionHeader) {
    const regExpFilename = /filename="(?<filename>.*)"/

    const filename: string | null =
      regExpFilename.exec(contentDispositionHeader)?.groups?.filename ?? null

    if (filename) {
      download(blob, filename)
    }
  } else {
    download(blob)
  }
}
