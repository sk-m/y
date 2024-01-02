import { del, get, post, put } from "@/app/core/request"
import { TableInput, appendTableInput } from "@/app/core/request.utils"

import { TCreateUser, TGetUsers } from "./users.codecs"

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

export type CreateUserInput = {
  username: string
  password: string
}

export const createUser = async (input: CreateUserInput) => {
  return post(apiUsers, {
    body: {
      username: input.username.trim(),
      password: input.password,
    },
  }).then((data) => TCreateUser.parse(data))
}

export type DeleteUsersInput = {
  userIds: number[]
}

export const deleteUsers = async (input: DeleteUsersInput) => {
  return del(apiUsers, {
    body: {
      user_ids: input.userIds,
    },
  })
}
