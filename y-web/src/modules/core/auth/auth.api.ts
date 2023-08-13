import { get, post } from "@/app/core/request"

import { TMe } from "./auth.codecs"

const apiLogin = "/auth/login"
const apiLogout = "/auth/logout"
const apiMe = "/auth/me"

export type LoginInput = {
  username: string
  password: string
}

export const login = async (input: LoginInput) => {
  return post(apiLogin, {
    body: input,
  })
}

export const logout = async () => {
  return post(apiLogout)
}

export const getMe = async () => {
  return get(apiMe).then((data) => TMe.parse(data))
}
