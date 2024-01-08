import { createQuery } from "@tanstack/solid-query"

import {
  GetUserGroupInput,
  UserGroupsInput,
  userGroup,
  userGroups,
} from "./user-groups.api"

export const userGroupsKey = "users-groups" as const
export const userGroupKey = "users-group" as const

export const useUserGroups = (
  input: () => UserGroupsInput,
  options: {
    refetchOnWindowFocus?: boolean
    refetchInterval?: number
  } = {}
) => {
  return createQuery(
    () => [userGroupsKey, input()],
    async () => userGroups(input()),
    options
  )
}

export const useUserGroup = (input: () => GetUserGroupInput) => {
  return createQuery(
    () => [userGroupKey, input().userGroupId],
    async () => userGroup(input())
  )
}
