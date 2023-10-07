import { get, put } from "@/app/core/request"
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

export type UpdateUserPasswordInput = {
  userId: number
  password: string
}

export const updateUserPassword = async (input: UpdateUserPasswordInput) => {
  return put(`${apiUsers}/${input.userId}/password`, {
    body: {
      password: input.password,
    },
  })
}
