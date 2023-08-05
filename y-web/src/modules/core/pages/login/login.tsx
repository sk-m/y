import { Component } from "solid-js"

import { Button } from "@/app/components/common/button/button"
import { InputField } from "@/app/components/common/input-field/input-field"
import { useForm } from "@/app/core/use-form"

import "./login.less"

const LoginPage: Component = () => {
  const form = useForm({
    defaultValues: {
      username: "",
      password: "",
    },
    onSubmit: (values) => {
      console.log(values)
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

            <Button buttonType="submit" width="100%">
              Log in
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}

export default LoginPage
