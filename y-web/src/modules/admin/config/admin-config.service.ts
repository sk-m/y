import { createQuery } from "@tanstack/solid-query"

import { ServiceOptions } from "@/app/core/utils"

import { adminConfigOptions } from "./admin-config.api"

export const adminConfigOptionsKey = "admin-config-options" as const

export const useAdminConfigOptions = (options: ServiceOptions) => {
  return createQuery(
    () => [adminConfigOptionsKey],
    async () => adminConfigOptions(),
    options
  )
}
