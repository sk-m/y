import { post } from "@/app/core/request"

const apiLogin = "/auth/login"

export type LoginInput = {
  username: string
  password: string
}

export const login = async (input: LoginInput) => {
  return post(apiLogin, {
    body: input,
  })
}
