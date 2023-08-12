import { createQuery } from "@tanstack/solid-query"

import { getMe } from "./auth.api"

export const authKey = ["auth-me"] as const

export const useAuth = () => {
  return createQuery(() => authKey, getMe)
}
