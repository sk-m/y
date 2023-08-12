import { get, post } from "@/app/core/request"

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
  return get(apiMe)
}
