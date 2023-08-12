import { get, post } from "@/app/core/request"

import { TMe } from "./auth.codecs"

const apiLogin = "/auth/login"
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

export const getMe = async () => {
  return get(apiMe).then((data) => TMe.parse(data))
}
