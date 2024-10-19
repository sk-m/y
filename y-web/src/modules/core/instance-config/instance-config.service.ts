import { createQuery } from "@tanstack/solid-query"

import { instanceConfig } from "./instance-config.api"

export const instanceConfigKey = "instance-config" as const

export const useInstanceConfig = (
  options: {
    refetchOnWindowFocus?: boolean
    refetchInterval?: number
  } = {}
) => {
  return createQuery(
    () => [instanceConfigKey],
    async () => instanceConfig(),
    options
  )
}
