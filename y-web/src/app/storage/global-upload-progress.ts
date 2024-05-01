import { createRoot } from "solid-js"
import { createStore } from "solid-js/store"

export type GlobalUploadProgressStatus = {
  numberOfFiles: number
  percentageUploaded: number
  totalSizeBytes: number
}

export const createGlobalUploadProgress = () => {
  const [status, setStatus] = createStore<GlobalUploadProgressStatus>({
    numberOfFiles: 0,
    percentageUploaded: 0,
    totalSizeBytes: 0,
  })

  return {
    status,
    setStatus,
  }
}

export const globalUploadProgressCtl = createRoot(createGlobalUploadProgress)
