import { get, put } from "@/app/core/request"

import { TGetAdminConfigOptions } from "./admin-config.codecs"

export const apiAdminConfig = "/admin/config"

export const adminConfigOptions = async () => {
  return get(apiAdminConfig).then((data) => TGetAdminConfigOptions.parse(data))
}

export type UpdateConfigOptionInput = {
  key: string
  value: string
}

export const updateConfigOption = async (input: UpdateConfigOptionInput) => {
  return put(`${apiAdminConfig}/${input.key}`, {
    body: {
      value: input.value,
    },
  })
}
