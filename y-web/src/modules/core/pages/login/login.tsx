import { Component, Show, createSignal } from "solid-js"

import { useNavigate } from "@solidjs/router"
import { createMutation, useQueryClient } from "@tanstack/solid-query"

import { Button } from "@/app/components/common/button/button"
import { InputError } from "@/app/components/common/input-error/input-error"
import { InputField } from "@/app/components/common/input-field/input-field"
import { ResponseError } from "@/app/core/request"
import { toastCtl } from "@/app/core/toast"
import { useForm } from "@/app/core/use-form"
import { routes } from "@/app/routes"
import { unsafe_t } from "@/i18n"
import { login } from "@/modules/core/auth/auth.api"
import { authKey } from "@/modules/core/auth/auth.service"

import "./login.less"

const LoginPage: Component = () => {
  const { notify } = toastCtl
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const $login = createMutation(login)

  const [error, setError] = createSignal<string | undefined>()

  const form = useForm({
    defaultValues: {
      username: "",
      password: "",
    },
    onSubmit: (values) => {
      $login.mutate(values, {
        onSuccess: () => {
          notify({
            title: "Welcome back!",
            severity: "success",
            icon: "waving_hand",
          })

          void queryClient.invalidateQueries(authKey)

          const urlParameters = new URLSearchParams(window.location.search)

          if (urlParameters.has("return")) {
            const to = urlParameters.get("return")

            if (to && !to.includes("/login")) {
              return void navigate(to)
            }
          }

          navigate(routes["/"])
        },
        onError: (requestError) => {
          setError((requestError as ResponseError).code)
        },
      })
    },
  })

  const { register, submit, errors } = form

  return (
    <div id="page-login">
      <div class="login-container">
        <div class="form-container">
          <div class="instance-name">{"y"}</div>

          <form class="login-form" onSubmit={submit}>
            <InputField
              label="Username"
              monospace
              width="100%"
              error={errors().username}
              inputProps={{
                autofocus: true,
                autocomplete: "username",
              }}
              {...register("username", { required: true })}
            />
            <InputField
              label="Password"
              type="password"
              monospace
              width="100%"
              error={errors().password}
              inputProps={{
                autocomplete: "current-password",
              }}
              {...register("password", { required: true })}
            />

            <Show when={error()}>
              <InputError
                error={
                  error() &&
                  (unsafe_t(`error.code.${error() as string}`) ?? error())
                }
              />
            </Show>

            <Button
              buttonType="submit"
              width="100%"
              disabled={$login.isLoading}
            >
              {$login.isLoading ? "Log in..." : "Log in"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}

export default LoginPage
