import { createMemo } from "solid-js"

import { useLocation } from "@solidjs/router"

export const domainName = {
  "": "Home",
  admin: "Administration",
  files: "Files",
} as const

export const domainIcon = {
  "": "home",
  admin: "handyman",
  files: "cloud",
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
