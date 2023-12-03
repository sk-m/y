import { z } from "zod"

export const TUserRightOptionValueType = z.union([
  z.literal("boolean"),
  z.literal("number"),
  z.literal("string"),
  z.literal("string_array"),
])

export const TUserRightTag = z.union([
  z.literal("dangerous"),
  z.literal("administrative"),
])

export type IUserRightTag = z.infer<typeof TUserRightTag>

export const TUserRightOption = z.object({
  name: z.string(),
  value_type: TUserRightOptionValueType,
})

export type IUserRightOption = z.infer<typeof TUserRightOption>

export const TUserRight = z.object({
  name: z.string(),
  options: z.array(TUserRightOption),
  tags: z.array(TUserRightTag),
})

export type IUserRight = z.infer<typeof TUserRight>

export const TUserRightCategory = z.object({
  name: z.string(),
  rights: z.array(TUserRight),
})

export type IUserRightCategory = z.infer<typeof TUserRightCategory>

export const TGetUserRights = z.object({
  categories: z.array(TUserRightCategory),
})
