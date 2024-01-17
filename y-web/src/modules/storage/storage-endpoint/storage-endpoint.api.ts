import { get } from "@/app/core/request"

import { TGetStorageEndpoints } from "./storage-endpoint.codecs"

export const apiStorageEndpoints = "/storage/endpoints" as const

export const storageEndpoints = async () => {
  return get(apiStorageEndpoints).then((data) =>
    TGetStorageEndpoints.parse(data)
  )
}
