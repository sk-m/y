import { z } from "zod"

export const TUser = z.object({
  id: z.number(),
  username: z.string(),
  created_at: z.string().datetime(),
  user_groups: z.array(z.number()),
})

export type IUser = z.infer<typeof TUser>
