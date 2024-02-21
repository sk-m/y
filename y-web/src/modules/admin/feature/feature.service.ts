import { createQuery } from "@tanstack/solid-query"

import { features } from "./feature.api"

export const featuresKey = "features" as const

export const useFeatures = (
  options: {
    refetchOnWindowFocus?: boolean
    refetchInterval?: number
    refetchOnMount?: boolean
  } = {}
) => {
  return createQuery(
    () => [featuresKey],
    async () => features(),
    {
      refetchOnMount: false,
      ...options,
    }
  )
}
