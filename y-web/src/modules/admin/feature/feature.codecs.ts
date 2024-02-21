import { z } from "zod"

export const TFeature = z.object({
  feature: z.string(),
  enabled: z.boolean(),
})

export type IFeature = z.infer<typeof TFeature>

export const TFeatures = z.array(TFeature)
export type IFeatures = z.infer<typeof TFeatures>

export const TGetFeatures = z.object({
  features: TFeatures,
})

export type IGetFeatures = z.infer<typeof TGetFeatures>
