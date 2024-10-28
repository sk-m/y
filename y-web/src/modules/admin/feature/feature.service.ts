import { createQuery } from "@tanstack/solid-query"

import { ServiceOptions } from "@/app/core/utils"

import { features } from "./feature.api"

export const featuresKey = "features" as const

export const useFeatures = (options: ServiceOptions = {}) => {
  return createQuery(
    () => [featuresKey],
    async () => features(),
    {
      refetchOnMount: false,
      ...options,
    }
  )
}
