import { z } from "zod"

export const TUser = z.object({
  id: z.number(),
  username: z.string(),
})

export type IUser = z.infer<typeof TUser>

export const TUsers = z.array(TUser)

export type IUsers = z.infer<typeof TUsers>

export const TGetUsers = z.object({
  users: TUsers,
  total_count: z.number(),
})
