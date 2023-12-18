import { z } from "zod"

export const userGroupType = { user: "user", everyone: "everyone" } as const

export const TUserGroupRow = z.object({
  id: z.number(),
  name: z.string(),
  group_type: z.nullable(z.string()),
})

export type IUserGroupRow = z.infer<typeof TUserGroupRow>

export const TUserGroupRows = z.array(TUserGroupRow)

export const TGetUserGroups = z.object({
  user_groups: TUserGroupRows,
  total_count: z.number(),
})

export const TCreateUserGroup = z.object({
  id: z.number(),
})

export const TUserGroupRightOptionValue = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.array(z.string()),
  z.array(z.number()),
  z.null(),
])

export type IUserGroupRightOptionValue = z.infer<
  typeof TUserGroupRightOptionValue
>

export const TUserGroupRight = z.object({
  right_name: z.string(),
  right_options: z.record(TUserGroupRightOptionValue),
})

export const TUserGroupDetails = z.object({
  id: z.number(),
  name: z.string(),
  rights: z.array(TUserGroupRight),
  group_type: z.nullable(z.string()),
})
