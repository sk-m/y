import { z } from "zod"

export const TStorageAccessRuleEntryType = z.enum(["file", "folder"])
export const TStorageAccessRuleAccessType = z.enum(["allow", "deny", "inherit"])
export const TStorageAccessRuleExecutorType = z.enum(["user_group", "user"])
export const TStorageAccessRuleActionType = z.enum([
  "list_entries",
  "download",
  "upload",
  "rename",
  "move",
  "delete",
  "manage_access",
])

export type IStorageAccessRuleEntryType = z.infer<
  typeof TStorageAccessRuleEntryType
>
export type IStorageAccessRuleAccessType = z.infer<
  typeof TStorageAccessRuleAccessType
>
export type IStorageAccessRuleExecutorType = z.infer<
  typeof TStorageAccessRuleExecutorType
>
export type IStorageAccessRuleActionType = z.infer<
  typeof TStorageAccessRuleActionType
>

// TODO define separate codecs for posting and getting

export const TStorageAccessRule = z.object({
  access_type: TStorageAccessRuleAccessType,
  action: TStorageAccessRuleActionType,
  executor_type: TStorageAccessRuleExecutorType,
  executor_id: z.number(),
  executor_name: z.string().nullable(),
})

export type IStorageAccessRule = z.infer<typeof TStorageAccessRule>

export const TCreateStorageAccessRules = z.object({
  rules: z.array(TStorageAccessRule),
})

export const TGetStorageEntryAccessRules = z.object({
  rules: z.array(TStorageAccessRule),
})
