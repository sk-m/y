import { z } from "zod"

export const TStorageUserPin = z.object({
  pin_id: z.number(),
  endpoint_id: z.number(),
  entry_id: z.number(),

  name: z.string(),
})

export type IStorageUserPin = z.infer<typeof TStorageUserPin>

export const TGetStorageUserPins = z.object({
  user_pins: z.array(TStorageUserPin),
})

export const TCreateStorageUserPin = z.object({
  pin_id: z.number(),
})
