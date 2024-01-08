import { createQuery } from "@tanstack/solid-query"

import { userRights } from "./user-rights.api"

export const userRightsKey = "userRights" as const

export const useUserRights = () => {
  return createQuery(
    () => [userRightsKey],
    async () => userRights()
  )
}
