import download from "downloadjs"

export const downloadResponseBlob = async (response: Response) => {
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
