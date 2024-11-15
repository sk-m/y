import { unsafe_t } from "@/i18n"

import { toastCtl } from "../toast"

export const genericErrorToast = (error: unknown) => {
  const { notify } = toastCtl
  const errorCode = (error as { code: string }).code
  const message = (error as { message?: string }).message

  notify({
    title: "Error",
    content: message ?? unsafe_t(`error.code.${errorCode}`) ?? errorCode,
    severity: "error",
    icon: "exclamation",
  })
}
