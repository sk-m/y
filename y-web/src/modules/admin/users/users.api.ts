import { get } from "@/app/core/request"
import { TableInput, appendTableInput } from "@/app/core/request.utils"

import { TGetUsers } from "./users.codecs"

export const apiUsers = "/admin/users"

export type UsersInput = TableInput

export const users = async (input: UsersInput) => {
  const query = new URLSearchParams()

  appendTableInput(query, input)

  return get(apiUsers, {
    query,
  }).then((data) => TGetUsers.parse(data))
}
