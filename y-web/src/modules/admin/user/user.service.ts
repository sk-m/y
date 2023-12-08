import { createQuery } from "@tanstack/solid-query"

import { GetUserInput, user } from "./user.api"

export const userKey = "user" as const

export const useUser = (
  input: () => GetUserInput,
  options: {
    refetchOnWindowFocus?: boolean
    refetchInterval?: number
  } = {}
) => {
  return createQuery(
    () => [userKey, input().userId],
    async () => user(input()),
    options
  )
}
