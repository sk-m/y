import { get, put } from "@/app/core/request"

import { TGetFeatures } from "./feature.codecs"

export const apiFeatures = "/admin/features"

export type UpdateFeatureInput = {
  feature: string
  enabled: boolean
}

export const updateFeature = async (input: UpdateFeatureInput) => {
  return put(`${apiFeatures}/${input.feature}`, {
    body: {
      enabled: input.enabled,
    },
  })
}

export const features = async () => {
  return get(apiFeatures).then((data) => TGetFeatures.parse(data))
}
