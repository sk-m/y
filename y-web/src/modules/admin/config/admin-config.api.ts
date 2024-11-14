import { get, patch } from "@/app/core/request"

import { TGetAdminConfigOptions } from "./admin-config.codecs"

export const apiAdminConfig = "/admin/config"

export const adminConfigOptions = async () => {
  return get(apiAdminConfig).then((data) => TGetAdminConfigOptions.parse(data))
}

export type UpdateConfigInput = { [key: string]: string }

export const updateConfig = async (input: UpdateConfigInput) => {
  return patch(apiAdminConfig, {
    body: input,
  })
}
