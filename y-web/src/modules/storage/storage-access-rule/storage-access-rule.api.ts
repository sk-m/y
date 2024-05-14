import { get, post } from "@/app/core/request"

import {
  IStorageAccessRule,
  IStorageAccessRuleEntryType,
  TGetStorageEntryAccessRules,
} from "./storage-access-rule.codecs"

export const apiStorageAccessRules = "/storage/access-rules" as const

export type GetStorageEntryAccessRulesInput = {
  endpointId: number
  entryType: IStorageAccessRuleEntryType
  entryId: number
}

export const storageEntryAccessRules = async (
  input: GetStorageEntryAccessRulesInput
) => {
  return get(
    `${apiStorageAccessRules}/${input.endpointId}/${input.entryType}/${input.entryId}`
  ).then((data) => TGetStorageEntryAccessRules.parse(data))
}

export type CreateStorageAccessRulesInput = {
  endpointId: number
  entryType: IStorageAccessRuleEntryType
  entryId: number

  rules: IStorageAccessRule[]
}

export const createStorageAccessRules = async (
  input: CreateStorageAccessRulesInput
) => {
  return post(
    `${apiStorageAccessRules}/${input.endpointId}/${input.entryType}/${input.entryId}`,
    {
      body: {
        rules: input.rules,
      },
    }
  )
}
