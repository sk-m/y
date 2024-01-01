import { Component } from "solid-js"

import { useNavigate } from "@solidjs/router"
import { createMutation, useQueryClient } from "@tanstack/solid-query"

import { Button } from "@/app/components/common/button/button"
import { Icon } from "@/app/components/common/icon/icon"
import { InputField } from "@/app/components/common/input-field/input-field"
import { Container } from "@/app/components/common/layout/container"
import { Stack } from "@/app/components/common/stack/stack"
import { Text } from "@/app/components/common/text/text"
import { useForm } from "@/app/core/use-form"
import { routes } from "@/app/routes"
import { createUser } from "@/modules/admin/users/users.api"
import { usersKey } from "@/modules/admin/users/users.service"

const NewUserPage: Component = () => {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const $createUser = createMutation(createUser)

  const form = useForm({
    defaultValues: {
      username: "",
      password: "",
    },
    disabled: () => $createUser.isLoading,
    onSubmit: (values) => {
      $createUser.mutate(
        {
          username: values.username,
          password: values.password,
        },
        {
          onSuccess: (response) => {
            void queryClient.invalidateQueries([usersKey])
            navigate(`${routes["/admin/users"]}/${response.id}`)
          },
        }
      )
    },
  })

  const { register, submit, errors } = form

  return (
    <Container
      size="s"
      style={{
        display: "flex",
        "flex-direction": "column",
        gap: "2em",
      }}
    >
      <Stack spacing="0.5em">
        <Text
          variant="h1"
          style={{
            display: "flex",
            "align-items": "center",
            gap: "0.5em",
          }}
        >
          <Icon name="person_add" grad={25} wght={500} />
          Create a new user
        </Text>
      </Stack>

      <form onSubmit={submit}>
        <Stack spacing="2em">
          <Stack spacing={"1em"}>
            <InputField
              label="Username"
              error={errors().username}
              width="100%"
              maxLength={127}
              inputProps={{
                autofocus: true,
                autocomplete: "username",
              }}
              {...register("username", {
                required: true,
              })}
            />
            <InputField
              label="Password"
              error={errors().password}
              width="100%"
              maxLength={512}
              type="password"
              inputProps={{
                autocomplete: "new-password",
              }}
              {...register("password", {
                required: true,
              })}
            />
          </Stack>
          <Stack direction="row" justifyContent="space-between">
            <Button
              onClick={() => navigate(routes["/admin/users"])}
              variant="secondary"
            >
              Back
            </Button>
            <Button buttonType="submit" disabled={$createUser.isLoading}>
              {$createUser.isLoading ? "Creating..." : "Create"}
            </Button>
          </Stack>
        </Stack>
      </form>
    </Container>
  )
}

export default NewUserPage
