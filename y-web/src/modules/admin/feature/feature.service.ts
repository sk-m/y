import { createQuery } from "@tanstack/solid-query"

import { features } from "./feature.api"

export const featuresKey = "features" as const

export const useFeatures = (
  options: {
    refetchOnWindowFocus?: boolean
    refetchInterval?: number
  } = {}
) => {
  return createQuery(
    () => [featuresKey],
    async () => features(),
    options
  )
}
