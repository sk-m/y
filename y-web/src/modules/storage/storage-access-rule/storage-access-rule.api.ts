import { del, get, post, put } from "@/app/core/request"

import {
  IStorageAccessRule,
  TGetStorageEntryAccessRules,
} from "./storage-access-rule.codecs"

export const apiStorageAccessRules = "/storage/access-rules" as const

export type GetStorageEntryAccessRulesInput = {
  endpointId: number
  entryId: number
}

export const storageEntryAccessRules = async (
  input: GetStorageEntryAccessRulesInput
) => {
  return get(
    `${apiStorageAccessRules}/${input.endpointId}/${input.entryId}`
  ).then((data) => TGetStorageEntryAccessRules.parse(data))
}

export type CreateStorageAccessRulesInput = {
  endpointId: number
  entryId: number

  rules: IStorageAccessRule[]
}

export const createStorageAccessRules = async (
  input: CreateStorageAccessRulesInput
) => {
  return post(`${apiStorageAccessRules}/${input.endpointId}/${input.entryId}`, {
    body: {
      rules: input.rules,
    },
  })
}

export type RemoveStorageEntryAccessRulesTemplateInput = {
  endpointId: number
  entryId: number
  templateId: number
}

export const removeStorageEntryAccessRulesTemplate = async (
  input: RemoveStorageEntryAccessRulesTemplateInput
) => {
  return del(
    `${apiStorageAccessRules}/${input.endpointId}/${input.entryId}/template/${input.templateId}`
  )
}

export type AddStorageEntryAccessRulesTemplateInput = {
  endpointId: number
  entryId: number
  templateId: number
}

export const addStorageEntryAccessRulesTemplate = async (
  input: AddStorageEntryAccessRulesTemplateInput
) => {
  return put(
    `${apiStorageAccessRules}/${input.endpointId}/${input.entryId}/template/${input.templateId}`
  )
}
