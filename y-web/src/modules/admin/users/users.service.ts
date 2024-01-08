import { createQuery } from "@tanstack/solid-query"

import { UsersInput, users } from "./users.api"

export const usersKey = "users" as const

export const useUsers = (
  input: () => UsersInput,
  options: {
    refetchOnWindowFocus?: boolean
    refetchInterval?: number
  } = {}
) => {
  return createQuery(
    () => [usersKey, input()],
    async () => users(input()),
    options
  )
}
