import { get, post } from "@/app/core/request"
import { TableInput, appendTableInput } from "@/app/core/request.utils"

import { IStorageAccessRule } from "../storage-access-rule/storage-access-rule.codecs"
import { TGetStorageAccessTemplates } from "./storage-access-rules-template.codecs"

export const apiStorageAccessRulesTemplates =
  "/storage/access-rules/templates" as const

export type StorageAccessRulesTemplatesInput = TableInput

export const storageAccessRulesTemplates = async (
  input: StorageAccessRulesTemplatesInput
) => {
  const query = new URLSearchParams()

  appendTableInput(query, input)

  return get(apiStorageAccessRulesTemplates, {
    query,
  }).then((data) => TGetStorageAccessTemplates.parse(data))
}

export type CreateStorageAccessRulesTemplateInput = {
  name: string

  initialEndpointId?: number
  initialEntryId?: number

  rules: IStorageAccessRule[]
}

export const createStorageAccessRulesTemplate = async (
  input: CreateStorageAccessRulesTemplateInput
) => {
  return post(`${apiStorageAccessRulesTemplates}`, {
    body: {
      name: input.name,

      initial_entry_endpoint_id: input.initialEndpointId,
      initial_entry_id: input.initialEntryId,

      rules: input.rules,
    },
  })
}
