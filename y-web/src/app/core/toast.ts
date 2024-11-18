import { createRoot, createSignal, createUniqueId } from "solid-js"

const DEFAULT_TOAST_DURATION_MS = 6000
export type ToastSeverity = "info" | "success" | "error" | "warning"

export type ToastInput = {
  title: string
  content?: string
  icon?: string

  severity?: ToastSeverity

  duration?: number
}

export type Toast = ToastInput & {
  id: string
  duration: number
}

const createToastController = () => {
  const [toasts, setToasts] = createSignal<Toast[]>([])

  const notify = (newToast: ToastInput) => {
    const toastId = createUniqueId()
    const toastDuration = newToast.duration ?? DEFAULT_TOAST_DURATION_MS

    setToasts((currentToasts) => [
      ...currentToasts,
      {
        ...newToast,
        id: toastId,
        duration: toastDuration,
      },
    ])

    if (toastDuration !== 0) {
      setTimeout(() => {
        setToasts((currentToasts) =>
          currentToasts.filter((toast) => toast.id !== toastId)
        )
      }, toastDuration)
    }
  }

  const remove = (toastId: string) => {
    setToasts((currentToasts) =>
      currentToasts.filter((toast) => toast.id !== toastId)
    )
  }

  return {
    toasts,
    notify,
    remove,
  }
}

export const toastCtl = createRoot(createToastController)
