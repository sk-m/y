import { createQuery } from "@tanstack/solid-query"

import {
  GetStorageEntryAccessRulesInput,
  storageEntryAccessRules,
} from "./storage-access-rule.api"

export const storageEntryAccessRulesKey = "storage-access-rules" as const

export const useStorageEntryAccessRules = (
  input: () => GetStorageEntryAccessRulesInput
) => {
  return createQuery(
    () => [storageEntryAccessRulesKey, input().endpointId, input().entryId],
    async () => storageEntryAccessRules(input())
  )
}
