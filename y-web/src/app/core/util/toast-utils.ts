import { unsafe_t } from "@/i18n"

import { toastCtl } from "../toast"

export const genericErrorToast = (error: unknown) => {
  const { notify } = toastCtl
  const errorCode = (error as { code: string }).code

  notify({
    title: "Error",
    content: unsafe_t(`error.code.${errorCode}`) ?? errorCode,
    severity: "error",
    icon: "exclamation",
  })
}
