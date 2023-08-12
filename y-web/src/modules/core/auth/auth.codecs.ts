import z from "zod"

export const TMe = z.object({
  id: z.number(),
  username: z.string(),
})

export type IMe = z.infer<typeof TMe>
