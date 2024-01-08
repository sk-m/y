import z from "zod"

export const TMe = z.object({
  id: z.number(),
  username: z.string(),
  user_rights: z.array(
    z.object({
      right_name: z.string(),
      right_options: z.any(),
    })
  ),
})

export type IMe = z.infer<typeof TMe>
