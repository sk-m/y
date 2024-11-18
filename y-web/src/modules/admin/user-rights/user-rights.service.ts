import { createQuery } from "@tanstack/solid-query"

import { ServiceOptions } from "@/app/core/utils"

import { userRights } from "./user-rights.api"

export const userRightsKey = "userRights" as const

export const useUserRights = (options?: ServiceOptions) => {
  return createQuery(
    () => [userRightsKey],
    async () => userRights(),
    options
  )
}
