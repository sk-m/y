import { createMemo } from "solid-js"

import { useLocation } from "@solidjs/router"

export const domainName = {
  "": "Home",
  admin: "Administration",
} as const

export const domainIcon = {
  "": "home",
  admin: "handyman",
} as const

export const useDomain = () => {
  const location = useLocation()

  const domain = createMemo(
    () => (location.pathname.split("/")[1] ?? "") as keyof typeof domainName
  )

  return {
    domain,
  }
}
