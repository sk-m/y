import { z } from "zod"

export const TStorageAccessRulesTemplate = z.object({
  id: z.number(),
  name: z.string(),
})

export type IStorageAccessRulesTemplate = z.infer<
  typeof TStorageAccessRulesTemplate
>

export const TStorageAccessRulesTemplates = z.array(TStorageAccessRulesTemplate)
export type IStorageAccessRulesTemplates = z.infer<
  typeof TStorageAccessRulesTemplates
>

export const TGetStorageAccessTemplates = z.object({
  templates: TStorageAccessRulesTemplates,
  total_count: z.number(),
})

export const TCreateStorageAccessRulesTemplate = z.object({})
