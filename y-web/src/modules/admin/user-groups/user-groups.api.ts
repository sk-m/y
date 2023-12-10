import { del, get, patch, post } from "@/app/core/request"
import { TableInput, appendTableInput } from "@/app/core/request.utils"

import {
  TCreateUserGroup,
  TGetUserGroups,
  TUserGroupDetails,
} from "./user-groups.codecs"

export const apiUserGroups = "/admin/user-groups"

export type UserGroupsInput = TableInput

export const userGroups = async (input: UserGroupsInput) => {
  const query = new URLSearchParams()

  appendTableInput(query, input)

  return get(apiUserGroups, {
    query,
  }).then((data) => TGetUserGroups.parse(data))
}

export type CreateUserGruopInput = {
  name: string
}

export const createUserGroup = async (input: CreateUserGruopInput) => {
  return post(apiUserGroups, {
    body: {
      name: input.name,
    },
  }).then((data) => TCreateUserGroup.parse(data))
}

export type GetUserGroupInput = {
  userGroupId: number
}

export const userGroup = async (input: GetUserGroupInput) => {
  return get(`${apiUserGroups}/${input.userGroupId}`).then((data) =>
    TUserGroupDetails.parse(data)
  )
}

export type UpdateUserGruopInput = {
  userGroupId: number
  rights: Record<
    string,
    {
      granted: boolean
      options: Record<string, unknown>
    }
  >
}

export const updateUserGroup = async (input: UpdateUserGruopInput) => {
  return patch(`${apiUserGroups}/${input.userGroupId}`, {
    body: {
      rights: input.rights,
    },
  })
}

export type DeleteUserGruopInput = {
  userGroupId: number
}

export const deleteUserGroup = async (input: DeleteUserGruopInput) => {
  return del(`${apiUserGroups}/${input.userGroupId}`)
}
