import { del, get, post } from "@/app/core/request"

import {
  TCreateStorageLocation,
  TGetStorageLocations,
} from "./storage-location.codecs"

export const apiStorageLocations = "/storage/locations" as const
export const apiAdminStorageLocations = "/admin/storage/locations" as const

export const storageLocations = async () => {
  return get(apiStorageLocations).then((data) =>
    TGetStorageLocations.parse(data)
  )
}

export type CreateStorageLocationInput = {
  name: string
  endpointId: number
  entryId: number
}

export const createStorageLocation = async (
  input: CreateStorageLocationInput
) => {
  return post(apiAdminStorageLocations, {
    body: {
      name: input.name.trim(),
      endpoint_id: input.endpointId,
      entry_id: input.entryId,
    },
  }).then((data) => TCreateStorageLocation.parse(data))
}

export type DeleteStorageLocation = {
  locationId: number
}

export const deleteStorageLocation = async (input: DeleteStorageLocation) => {
  return del(`${apiAdminStorageLocations}/${input.locationId}`)
}
