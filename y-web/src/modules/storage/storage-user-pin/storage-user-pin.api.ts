import { del, get, post } from "@/app/core/request"

import {
  TCreateStorageUserPin,
  TGetStorageUserPins,
} from "./storage-user-pin.codecs"

export const apiStorageUserPins = "/storage/user-pins" as const

export const storageUserPins = async () => {
  return get(apiStorageUserPins).then((data) => TGetStorageUserPins.parse(data))
}

export type CreateStorageUserPinInput = {
  endpointId: number
  entryId: number

  name: string
}

export const createStorageUserPin = async (
  input: CreateStorageUserPinInput
) => {
  return post(apiStorageUserPins, {
    body: {
      endpoint_id: input.endpointId,
      entry_id: input.entryId,
      name: input.name.trim(),
    },
  }).then((data) => TCreateStorageUserPin.parse(data))
}

export type DeleteStorageUserPin = {
  pinId: number
}

export const deleteStorageUserPin = async (input: DeleteStorageUserPin) => {
  return del(`${apiStorageUserPins}/${input.pinId}`)
}
