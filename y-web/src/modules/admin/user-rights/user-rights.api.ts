import { get } from "@/app/core/request"

import { TGetUserRights } from "./user-rights.codecs"

export const apiUserRights = "/user-rights"

export const userRights = async () => {
  return get(apiUserRights).then((data) => TGetUserRights.parse(data))
}
