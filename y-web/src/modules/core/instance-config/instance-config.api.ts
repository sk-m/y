import { get } from "@/app/core/request"

import { TGetInstanceConfig } from "./instance-config.codecs"

export const apiInstanceConfig = "/instance-config"

export const instanceConfig = async () => {
  return get(apiInstanceConfig).then((data) => TGetInstanceConfig.parse(data))
}
