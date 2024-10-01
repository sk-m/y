import {
  Component,
  For,
  Show,
  createEffect,
  createMemo,
  createSignal,
  untrack,
} from "solid-js"

import { createMutation, useQueryClient } from "@tanstack/solid-query"

import { Button } from "@/app/components/common/button/button"
import { Card } from "@/app/components/common/card/card"
import { Icon } from "@/app/components/common/icon/icon"
import { Modal } from "@/app/components/common/modal/modal"
import { Stack } from "@/app/components/common/stack/stack"
import { Text } from "@/app/components/common/text/text"
import { toastCtl } from "@/app/core/toast"
import { useForm } from "@/app/core/use-form"
import { genericErrorToast } from "@/app/core/util/toast-utils"
import { UserGroupRight } from "@/modules/admin/components/user-group/user-group-right"
import { UserGroupRightCategory } from "@/modules/admin/components/user-group/user-group-right-category"
import { updateUserGroup } from "@/modules/admin/user-groups/user-groups.api"
import {
  IUserGroupDetails,
  IUserGroupRightOptionValue,
} from "@/modules/admin/user-groups/user-groups.codecs"
import {
  userGroupKey,
  userGroupsKey,
} from "@/modules/admin/user-groups/user-groups.service"
import { useUserRights } from "@/modules/admin/user-rights/user-rights.service"
import { authKey } from "@/modules/core/auth/auth.service"

export type UserGroupRightsSubpageProps = {
  group: IUserGroupDetails
  groupManagementAllowed: boolean
}

export type UserGroupFieldValues = {
  [K in `right:${string}`]: boolean
} & { [K in `right_option:${string}`]: IUserGroupRightOptionValue }

export type UserGroupWatchedFields = ["right:*", "right_option:*"]

const UserGroupRightsSubpage: Component<UserGroupRightsSubpageProps> = (
  props
) => {
  const queryClient = useQueryClient()
  const { notify } = toastCtl

  let formRef: HTMLFormElement | undefined

  const $userRights = useUserRights()

  const userRights = createMemo(
    () =>
      $userRights.data ?? {
        categories: [],
      }
  )

  const $updateUserGroup = createMutation(updateUserGroup)

  const [updateConfirmationModalOpen, setUpdateConfirmationModalOpen] =
    createSignal(false)

  const onSubmit = (values: UserGroupFieldValues) => {
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
          rights[rightName]!.options[optionName] = value
        }
      }
    }

    void $updateUserGroup.mutate(
      {
        userGroupId: props.group.id,
        rights,
      },
      {
        onSuccess: () => {
          notify({
            title: "Changes saved",
            content: "User group was updated",
            severity: "success",
            icon: "check",
          })

          void queryClient.invalidateQueries(authKey)
          void queryClient.invalidateQueries([userGroupsKey])
          void queryClient.invalidateQueries([userGroupKey, props.group.id])
        },
        onError: (error) => genericErrorToast(error),
        onSettled: () => {
          setUpdateConfirmationModalOpen(false)
        },
      }
    )
  }

  const form = useForm<UserGroupFieldValues, UserGroupWatchedFields>({
    defaultValues: {},
    disabled: () => !$userRights.data || $updateUserGroup.isLoading,
    onSubmit,
    watch: ["right:*", "right_option:*"],
  })

  const { setValue, submit } = form

  // ! TODO implement form.reset()
  createEffect(() => {
    if ($userRights.data) {
      for (const right of props.group.rights) {
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
    <>
      <Modal
        open={updateConfirmationModalOpen()}
        keepMounted
        onClose={() => setUpdateConfirmationModalOpen(false)}
        style={{
          "max-width": "450px",
        }}
        header={
          <Stack spacing={"1.5em"} direction="row" alignItems="center">
            <div
              style={{
                display: "flex",
                "align-items": "center",
                "justify-content": "center",

                padding: "1em",

                "background-color": "var(--color-border-15)",
                "border-radius": "15px",
              }}
            >
              <Icon grad={25} wght={500} size={24} name="warning" />
            </div>
            <Stack spacing="0.5em">
              <Text
                variant="h2"
                style={{
                  margin: 0,
                }}
                color="var(--color-text-grey-025)"
              >
                Confirm changes
              </Text>
            </Stack>
          </Stack>
        }
      >
        <Stack spacing={"1.5em"}>
          <Text>
            Are you sure you want to commit your changes to this group?
          </Text>

          <Text>
            All users that are assigned to this group will be affected
            immediately.
          </Text>

          <Stack direction="row" justifyContent="space-between">
            <Button
              variant="secondary"
              onClick={() => setUpdateConfirmationModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              disabled={$updateUserGroup.isLoading}
              onClick={() => {
                void formRef?.dispatchEvent(new Event("submit"))
              }}
            >
              {$updateUserGroup.isLoading ? "Saving..." : "Confirm"}
            </Button>
          </Stack>
        </Stack>
      </Modal>
      <form ref={formRef as HTMLFormElement} onSubmit={submit}>
        <Stack spacing="2em">
          <For each={userRights().categories}>
            {(category) => (
              <UserGroupRightCategory category={category}>
                <Stack>
                  <For each={category.rights}>
                    {(right) => (
                      <>
                        <hr />
                        <UserGroupRight
                          disabled={!props.groupManagementAllowed}
                          right={right}
                          form={form}
                        />
                      </>
                    )}
                  </For>
                </Stack>
              </UserGroupRightCategory>
            )}
          </For>

          <Show when={props.groupManagementAllowed}>
            <Card>
              <Stack direction="row" spacing="1em" justifyContent="flex-end">
                <Button
                  disabled={$updateUserGroup.isLoading}
                  onClick={() => setUpdateConfirmationModalOpen(true)}
                >
                  Save changes
                </Button>
              </Stack>
            </Card>
          </Show>
        </Stack>
      </form>
    </>
  )
}

export default UserGroupRightsSubpage
