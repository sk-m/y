import {
  Component,
  For,
  Show,
  createEffect,
  createMemo,
  untrack,
} from "solid-js"

import { useNavigate, useParams } from "@solidjs/router"
import { createMutation } from "@tanstack/solid-query"

import { Button } from "@/app/components/common/button/button"
import { Card } from "@/app/components/common/card/card"
import { Icon } from "@/app/components/common/icon/icon"
import { Container } from "@/app/components/common/layout/container"
import { Stack } from "@/app/components/common/stack/stack"
import { Text } from "@/app/components/common/text/text"
import { useForm } from "@/app/core/use-form"
import { updateUserGroup } from "@/modules/admin/user-groups/user-groups.api"
import { IUserGroupRightOptionValue } from "@/modules/admin/user-groups/user-groups.codecs"
import { useUserGroup } from "@/modules/admin/user-groups/user-groups.service"
import { useUserRights } from "@/modules/admin/user-rights/user-rights.service"

import { UserGroupRight } from "../../../components/user-group/user-group-right"
import { UserGroupRightCategory } from "../../../components/user-group/user-group-right-category"

export type UserGroupFieldValues = {
  [K in `right:${string}`]: boolean
} & { [K in `right_option:${string}`]: IUserGroupRightOptionValue }

export type UserGroupWatchedFields = ["right:*", "right_option:*"]

const UserGroupPage: Component = () => {
  const params = useParams()
  const navigate = useNavigate()

  const $updateUserGroup = createMutation(updateUserGroup)

  const $userRights = useUserRights()
  const $userGroup = useUserGroup(() => ({
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    userGroupId: Number.parseInt(params.groupId!, 10),
  }))

  const userRights = createMemo(
    () =>
      $userRights.data ?? {
        categories: [],
      }
  )

  const onSubmit = (values: UserGroupFieldValues) => {
    if (!$userGroup.data?.id) return

    const rights: {
      [key: string]: {
        granted: boolean
        options: Record<string, unknown>
      }
    } = {}

    // ! TODO add support for non-flat FieldValues
    for (const [field, value] of Object.entries(values)) {
      if (field.startsWith("right:")) {
        rights[field.replace("right:", "")] = {
          granted: value as boolean,
          options: {},
        }
        // eslint-disable-next-line sonarjs/elseif-without-else
      } else if (field.startsWith("right_option:")) {
        const parts = field.split(":")

        const rightName = parts[1] as string
        // eslint-disable-next-line @typescript-eslint/no-magic-numbers
        const optionName = parts[2] as string

        if (rights[rightName]) {
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          rights[rightName]!.options[optionName] = value
        }
      }
    }

    void $updateUserGroup.mutate(
      {
        userGroupId: $userGroup.data.id,
        rights,
      },
      {
        onSuccess: () => {
          void $userGroup.refetch()
        },
      }
    )
  }

  const form = useForm<UserGroupFieldValues, UserGroupWatchedFields>({
    defaultValues: {},
    disabled: () =>
      !$userGroup.data || !$userRights.data || $updateUserGroup.isLoading,
    onSubmit,
    watch: ["right:*", "right_option:*"],
  })

  const { setValue, submit } = form

  // ! TODO implement form.reset()
  createEffect(() => {
    if ($userGroup.data && $userRights.data) {
      for (const right of $userGroup.data.rights) {
        untrack(() => setValue(`right:${right.right_name}`, () => true))

        for (const [name, value] of Object.entries(right.right_options)) {
          untrack(() =>
            setValue(`right_option:${right.right_name}:${name}`, () => value)
          )
        }
      }
    }
  })

  return (
    <Show when={$userGroup.data}>
      <Container size="m">
        <Stack spacing="2em">
          <Text
            variant="h1"
            style={{
              display: "flex",
              "align-items": "center",
              gap: "0.5em",
            }}
          >
            <Icon name="groups" grad={25} wght={500} />
            {$userGroup.data?.name ?? "Loading..."}
          </Text>

          <form onSubmit={submit}>
            <Stack spacing="2em">
              <For each={userRights().categories}>
                {(category) => (
                  <UserGroupRightCategory category={category}>
                    <Stack>
                      <For each={category.rights}>
                        {(right) => (
                          <>
                            <hr />
                            <UserGroupRight right={right} form={form} />
                          </>
                        )}
                      </For>
                    </Stack>
                  </UserGroupRightCategory>
                )}
              </For>

              <Card>
                <Stack
                  direction="row"
                  spacing="1em"
                  alignItems="center"
                  justifyContent="space-between"
                >
                  <Button
                    variant="secondary"
                    disabled={$updateUserGroup.isLoading}
                    onClick={() => navigate("/admin/user-groups")}
                  >
                    Back
                  </Button>
                  <Stack direction="row" spacing="1em">
                    <Button
                      buttonType="submit"
                      disabled={$updateUserGroup.isLoading}
                    >
                      {$updateUserGroup.isLoading
                        ? "Saving..."
                        : "Save changes"}
                    </Button>
                  </Stack>
                </Stack>
              </Card>
            </Stack>
          </form>
        </Stack>
      </Container>
    </Show>
  )
}

export default UserGroupPage
