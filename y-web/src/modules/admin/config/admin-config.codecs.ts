import { z } from "zod"

export const TAdminConfigOption = z.object({
  key: z.string(),
  value: z.string().nullable(),

  updated_by: z.number().nullable(),
  updated_by_username: z.string().nullable(),

  updated_at: z
    .string()
    .refine((x) => x && !Number.isNaN(Date.parse(x)))
    .nullable(),
})

export type IAdminConfigOption = z.infer<typeof TAdminConfigOption>

export const TAdminConfigOptions = z.array(TAdminConfigOption)
export type IAdminConfigOptions = z.infer<typeof TAdminConfigOptions>

export const TGetAdminConfigOptions = z.object({
  options: TAdminConfigOptions,
})

export type IGetAdminConfigOptions = z.infer<typeof TGetAdminConfigOptions>
