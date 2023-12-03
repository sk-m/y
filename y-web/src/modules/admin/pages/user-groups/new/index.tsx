import { Component } from "solid-js"

import { useNavigate } from "@solidjs/router"
import { createMutation } from "@tanstack/solid-query"

import { Button } from "@/app/components/common/button/button"
import { Icon } from "@/app/components/common/icon/icon"
import { InputField } from "@/app/components/common/input-field/input-field"
import { Container } from "@/app/components/common/layout/container"
import { Stack } from "@/app/components/common/stack/stack"
import { Text } from "@/app/components/common/text/text"
import { useForm } from "@/app/core/use-form"
import { createUserGroup } from "@/modules/admin/user-groups/user-groups.api"

const NewUserGroupPage: Component = () => {
  const navigate = useNavigate()

  const $createUserGroup = createMutation(createUserGroup)

  const form = useForm({
    defaultValues: {
      name: "",
    },
    disabled: () => $createUserGroup.isLoading,
    onSubmit: (values) => {
      $createUserGroup.mutate(
        {
          name: values.name,
        },
        {
          onSuccess: (response) => {
            navigate(`/admin/user-groups/${response.id}`)
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
          <Icon name="group_add" grad={25} wght={500} />
          Create a new user group
        </Text>
        <Text variant="secondary">
          You will be able to set up user rights later.
        </Text>
      </Stack>

      <form onSubmit={submit}>
        <Stack spacing="2em">
          <InputField
            label="Group name"
            error={errors().name}
            width="100%"
            subtext="Group name is visible to everyone. Keep it short and descriptive."
            maxLength={256}
            inputProps={{
              autofocus: true,
              autocomplete: "off",
            }}
            {...register("name", {
              required: true,
            })}
          />
          <Stack direction="row" justifyContent="space-between">
            <Button
              onClick={() => navigate("/admin/user-groups")}
              variant="secondary"
            >
              Back
            </Button>
            <Button buttonType="submit" disabled={$createUserGroup.isLoading}>
              {$createUserGroup.isLoading ? "Creating..." : "Create"}
            </Button>
          </Stack>
        </Stack>
      </form>
    </Container>
  )
}

export default NewUserGroupPage
