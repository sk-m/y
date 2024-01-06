import { Component, createEffect } from "solid-js"

import { useNavigate } from "@solidjs/router"
import { createMutation, useQueryClient } from "@tanstack/solid-query"

import { Button } from "@/app/components/common/button/button"
import { Icon } from "@/app/components/common/icon/icon"
import { InputField } from "@/app/components/common/input-field/input-field"
import { Container } from "@/app/components/common/layout/container"
import { Stack } from "@/app/components/common/stack/stack"
import { Text } from "@/app/components/common/text/text"
import { toastCtl } from "@/app/core/toast"
import { useForm } from "@/app/core/use-form"
import { genericErrorToast } from "@/app/core/util/toast-utils"
import { Breadcrumb, Breadcrumbs } from "@/app/layout/components/breadcrumbs"
import { routes } from "@/app/routes"
import { createUserGroup } from "@/modules/admin/user-groups/user-groups.api"
import { userGroupsKey } from "@/modules/admin/user-groups/user-groups.service"
import { useAuth } from "@/modules/core/auth/auth.service"

const USER_GROUPS_ROUTE = routes["/admin/user-groups"]

const NewUserGroupPage: Component = () => {
  const $auth = useAuth()

  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { notify } = toastCtl

  createEffect(() => {
    const groupCreationAllowed = $auth.data?.user_rights.some(
      (right) =>
        right.right_name === "manage_user_groups" &&
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        (right.right_options["allow_creating_user_groups"] as unknown) === true
    )

    if (!groupCreationAllowed) {
      navigate(USER_GROUPS_ROUTE)
    }
  })
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
            notify({
              title: "Group created",
              content: "User group was created",
              severity: "success",
              icon: "check",
            })

            void queryClient.invalidateQueries([userGroupsKey])
            navigate(`/admin/user-groups/${response.id}`)
          },
          onError: (error) => genericErrorToast(error),
        }
      )
    },
  })

  const { register, submit, errors } = form

  return (
    <Container size="s">
      <Breadcrumbs
        style={{
          "margin-bottom": "1em",
        }}
      >
        <Breadcrumb path={routes["/admin"]}>Administration</Breadcrumb>
        <Breadcrumb path={USER_GROUPS_ROUTE}>Groups</Breadcrumb>
        <Breadcrumb path={routes["/admin/user-groups/new"]}>new</Breadcrumb>
      </Breadcrumbs>

      <Stack spacing="2em">
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
      </Stack>
    </Container>
  )
}

export default NewUserGroupPage
