import { createQuery } from "@tanstack/solid-query"

import { ResponseError } from "@/app/core/request"

import { adminConfigOptions } from "./admin-config.api"

export const adminConfigOptionsKey = "admin-config-options" as const

export const useAdminConfigOptions = (
  options: {
    refetchOnWindowFocus?: boolean
    refetchInterval?: number
    onError?: (error: ResponseError) => void
  } = {}
) => {
  return createQuery(
    () => [adminConfigOptionsKey],
    async () => adminConfigOptions(),
    options
  )
}
