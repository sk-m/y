import { createQuery } from "@tanstack/solid-query"

import { ServiceOptions } from "@/app/core/utils"

import { GetUserInput, user } from "./user.api"

export const userKey = "user" as const

export const useUser = (
  input: () => GetUserInput,
  options: ServiceOptions = {}
) => {
  return createQuery(
    () => [userKey, input().userId],
    async () => user(input()),
    options
  )
}
