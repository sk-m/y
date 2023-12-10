import {
  Component,
  For,
  Show,
  createEffect,
  createMemo,
  createSignal,
  untrack,
} from "solid-js"

import { useNavigate, useParams } from "@solidjs/router"
import { createMutation, useQueryClient } from "@tanstack/solid-query"

import { Button } from "@/app/components/common/button/button"
import { Card } from "@/app/components/common/card/card"
import { ExpandButton } from "@/app/components/common/expand-button/expand-button"
import {
  ExpandButtonEntries,
  ExpandButtonEntry,
} from "@/app/components/common/expand-button/expand-button-entry"
import { Icon } from "@/app/components/common/icon/icon"
import { Container } from "@/app/components/common/layout/container"
import { Modal } from "@/app/components/common/modal/modal"
import { Stack } from "@/app/components/common/stack/stack"
import { Text } from "@/app/components/common/text/text"
import { useForm } from "@/app/core/use-form"
import { routes } from "@/app/routes"
import {
  deleteUserGroup,
  updateUserGroup,
} from "@/modules/admin/user-groups/user-groups.api"
import { IUserGroupRightOptionValue } from "@/modules/admin/user-groups/user-groups.codecs"
import {
  useUserGroup,
  userGroupKey,
  userGroupsKey,
} from "@/modules/admin/user-groups/user-groups.service"
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
  const queryClient = useQueryClient()

  let formRef: HTMLFormElement | undefined

  const [updateConfirmationModalOpen, setUpdateConfirmationModalOpen] =
    createSignal(false)
  const [deleteConfirmationModalOpen, setDeleteConfirmationModalOpen] =
    createSignal(false)

  const $updateUserGroup = createMutation(updateUserGroup)
  const $deleteUserGroup = createMutation(deleteUserGroup)

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
          void queryClient.invalidateQueries([userGroupsKey])
          void queryClient.invalidateQueries([userGroupKey, $userGroup.data.id])
        },
        onSettled: () => {
          setUpdateConfirmationModalOpen(false)
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

          <Stack
            direction="row"
            justifyContent="space-between"
            style={{
              "margin-top": "1.5em",
            }}
          >
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
      <Modal
        open={deleteConfirmationModalOpen()}
        keepMounted
        onClose={() => setDeleteConfirmationModalOpen(false)}
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
                Confirm group deletion
              </Text>
            </Stack>
          </Stack>
        }
      >
        <Stack spacing={"1.5em"}>
          <Text>Are you sure you want to delete this user group?</Text>

          <Text>
            All users that are assigned to this group will unsassigned
            automatically.
          </Text>

          <Stack
            direction="row"
            justifyContent="space-between"
            style={{
              "margin-top": "1.5em",
            }}
          >
            <Button
              variant="secondary"
              onClick={() => setDeleteConfirmationModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              disabled={$deleteUserGroup.isLoading}
              onClick={() => {
                if (!$userGroup.data?.id) return
                $deleteUserGroup.mutate(
                  {
                    userGroupId: $userGroup.data.id,
                  },
                  {
                    onSuccess: () => {
                      void queryClient.invalidateQueries([userGroupsKey])
                      navigate(routes["/admin/user-groups"])
                    },
                  }
                )
              }}
            >
              {$deleteUserGroup.isLoading ? "Deleting..." : "Confirm"}
            </Button>
          </Stack>
        </Stack>
      </Modal>
      <Show when={$userGroup.data}>
        <Container size="m">
          <Stack spacing="2em">
            <Stack
              direction="row"
              justifyContent="space-between"
              alignItems="center"
            >
              <Text
                variant="h1"
                style={{
                  display: "flex",
                  "align-items": "center",
                  gap: "0.5em",
                }}
              >
                <Icon name="groups" grad={25} wght={500} />
                {$userGroup.data?.name ?? ""}
              </Text>

              <ExpandButton icon="bolt" label="Actions" position="left">
                <ExpandButtonEntries>
                  <ExpandButtonEntry icon="edit">Rename</ExpandButtonEntry>
                  <ExpandButtonEntry
                    icon="delete"
                    variant="danger"
                    onClick={() => setDeleteConfirmationModalOpen(true)}
                  >
                    Delete
                  </ExpandButtonEntry>
                </ExpandButtonEntries>
              </ExpandButton>
            </Stack>

            <Text variant="h2">Group Rights</Text>

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
                      onClick={() => navigate(routes["/admin/user-groups"])}
                    >
                      Back
                    </Button>
                    <Stack direction="row" spacing="1em">
                      <Button
                        disabled={$updateUserGroup.isLoading}
                        onClick={() => setUpdateConfirmationModalOpen(true)}
                      >
                        Save changes
                      </Button>
                    </Stack>
                  </Stack>
                </Card>
              </Stack>
            </form>
          </Stack>
        </Container>
      </Show>
    </>
  )
}

export default UserGroupPage
