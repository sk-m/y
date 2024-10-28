import { createQuery } from "@tanstack/solid-query"

import { ServiceOptions } from "@/app/core/utils"

import { UsersInput, users } from "./users.api"

export const usersKey = "users" as const

export const useUsers = (
  input: () => UsersInput,
  options: ServiceOptions = {}
) => {
  return createQuery(
    () => [usersKey, input()],
    async () => users(input()),
    options
  )
}
