import { get, patch } from "@/app/core/request"

import { TUser } from "./user.codecs"

export const apiUsers = "/admin/users"

export type UpdateUserGruopMembershipInput = {
  userId: number
  userGroups: number[]
}

export const updateUserGroupMembership = async (
  input: UpdateUserGruopMembershipInput
) => {
  return patch(`${apiUsers}/${input.userId}/groups`, {
    body: {
      user_groups: input.userGroups,
    },
  })
}

export type GetUserInput = {
  userId: number | string
}

export const user = async (input: GetUserInput) => {
  return get(`${apiUsers}/${input.userId}`).then((data) => TUser.parse(data))
}
