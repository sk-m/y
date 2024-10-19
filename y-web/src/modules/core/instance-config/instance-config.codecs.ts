import { z } from "zod"

export const TInstanceConfigOption = z.object({
  key: z.string(),
  value: z.string().nullable(),
})

export type IInstanceConfigOption = z.infer<typeof TInstanceConfigOption>

export const TInstanceConfigOptions = z.array(TInstanceConfigOption)
export type IInstanceConfigOptions = z.infer<typeof TInstanceConfigOptions>

export const TGetInstanceConfig = z.object({
  instance_config: TInstanceConfigOptions,
})
export type IGetInstanceConfig = z.infer<typeof TGetInstanceConfig>
