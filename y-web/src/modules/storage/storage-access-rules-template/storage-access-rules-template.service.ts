import { createQuery } from "@tanstack/solid-query"

import {
  StorageAccessRulesTemplatesInput,
  storageAccessRulesTemplates,
} from "./storage-access-rules-template.api"

export const storageAccessRulesTemplatesKey =
  "storage-access-rules-templates" as const

export const useStorageAccessRulesTemplates = (
  input: () => StorageAccessRulesTemplatesInput,
  options: {
    refetchOnWindowFocus?: boolean
    refetchInterval?: number
  } = {}
) => {
  return createQuery(
    () => [storageAccessRulesTemplatesKey, input()],
    async () => storageAccessRulesTemplates(input()),
    options
  )
}
