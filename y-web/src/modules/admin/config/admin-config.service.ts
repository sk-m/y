import { createQuery } from "@tanstack/solid-query"

import { ResponseError } from "@/app/core/request"
import { ServiceOptions } from "@/app/core/utils"

import { adminConfigOptions } from "./admin-config.api"

export const adminConfigOptionsKey = "admin-config-options" as const

export const useAdminConfigOptions = (
  // TODO: don't use onError. We need a more robust way of handling API errors
  options: ServiceOptions & {
    onError?: (error: ResponseError) => void
  } = {}
) => {
  return createQuery(
    () => [adminConfigOptionsKey],
    async () => adminConfigOptions(),
    options
  )
}
