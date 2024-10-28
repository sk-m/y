import { createQuery } from "@tanstack/solid-query"

import { ServiceOptions } from "@/app/core/utils"

import { instanceConfig } from "./instance-config.api"

export const instanceConfigKey = "instance-config" as const

export const useInstanceConfig = (options: ServiceOptions = {}) => {
  return createQuery(
    () => [instanceConfigKey],
    async () => instanceConfig(),
    options
  )
}
