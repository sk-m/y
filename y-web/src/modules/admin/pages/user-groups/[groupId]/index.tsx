import {
  Component,
  For,
  Match,
  Show,
  Switch,
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
import {
  KeyValue,
  KeyValueFields,
} from "@/app/components/common/key-value/key-value"
import { Container } from "@/app/components/common/layout/container"
import { Modal } from "@/app/components/common/modal/modal"
import { Pill } from "@/app/components/common/pill/pill"
import { Stack } from "@/app/components/common/stack/stack"
import { Text } from "@/app/components/common/text/text"
import { toastCtl } from "@/app/core/toast"
import { useForm } from "@/app/core/use-form"
import { genericErrorToast } from "@/app/core/util/toast-utils"
import { Breadcrumb, Breadcrumbs } from "@/app/layout/components/breadcrumbs"
import { routes } from "@/app/routes"
import {
  UpdateUserGroupInput,
  deleteUserGroup,
  updateUserGroup,
} from "@/modules/admin/user-groups/user-groups.api"
import {
  IUserGroupRightOptionValue,
  userGroupType,
} from "@/modules/admin/user-groups/user-groups.codecs"
import {
  useUserGroup,
  userGroupKey,
  userGroupsKey,
} from "@/modules/admin/user-groups/user-groups.service"
import { useUserRights } from "@/modules/admin/user-rights/user-rights.service"
import { useAuth } from "@/modules/core/auth/auth.service"

import { UserGroupRight } from "../../../components/user-group/user-group-right"
import { UserGroupRightCategory } from "../../../components/user-group/user-group-right-category"

export type UserGroupFieldValues = {
  [K in `right:${string}`]: boolean
} & { [K in `right_option:${string}`]: IUserGroupRightOptionValue }

export type UserGroupWatchedFields = ["right:*", "right_option:*"]

const USER_GROUPS_ROUTE = routes["/admin/user-groups"]

const UserGroupPage: Component = () => {
  const $auth = useAuth()

  const params = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { notify } = toastCtl

  let formRef: HTMLFormElement | undefined

  const groupManagementPermissions = createMemo(() => {
    let groupManagementAllowed = false
    let groupDeletionAllowed = false

    for (const right of $auth.data?.user_rights ?? []) {
      if (right.right_name === "manage_user_groups") {
        groupManagementAllowed = true

        if (
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          (right.right_options?.["allow_deleting_user_groups"] as unknown) ===
          true
        ) {
          groupDeletionAllowed = true
          break
        }
      }
    }

    return { groupManagementAllowed, groupDeletionAllowed }
  })

  const [updateConfirmationModalOpen, setUpdateConfirmationModalOpen] =
    createSignal(false)
  const [deleteConfirmationModalOpen, setDeleteConfirmationModalOpen] =
    createSignal(false)

  const $updateUserGroup = createMutation(updateUserGroup)
  const $deleteUserGroup = createMutation(deleteUserGroup)

  const $userRights = useUserRights()
  const $userGroup = useUserGroup(() => ({
    userGroupId: Number.parseInt(params.groupId!, 10),
  }))

  const userRights = createMemo(
    () =>
      $userRights.data ?? {
        categories: [],
      }
  )

  createEffect(() => {
    if ($userGroup.isError) {
      genericErrorToast($userGroup.error)
      navigate(USER_GROUPS_ROUTE)
    }
  })

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
          notify({
            title: "Changes saved",
            content: "User group was updated",
            severity: "success",
            icon: "check",
          })

          void queryClient.invalidateQueries([userGroupsKey])
          void queryClient.invalidateQueries([userGroupKey, $userGroup.data.id])
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

  const saveKeyValue = (key: keyof UpdateUserGroupInput, value: string) => {
    if (!$userGroup.data) return

    void $updateUserGroup.mutate(
      {
        userGroupId: $userGroup.data.id,
        [key]: value,
      },
      {
        onSuccess: () => {
          void queryClient.invalidateQueries([userGroupsKey])
          void queryClient.invalidateQueries([userGroupKey, $userGroup.data.id])
        },
        onError: (error) => genericErrorToast(error),
      }
    )
  }

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

          <Stack direction="row" justifyContent="space-between">
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
                      notify({
                        title: "Group deleted",
                        content: "User group was deleted",
                        severity: "success",
                        icon: "check",
                      })

                      void queryClient.invalidateQueries([userGroupsKey])
                      navigate(USER_GROUPS_ROUTE)
                    },
                    onError: (error) => genericErrorToast(error),
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
          <Breadcrumbs
            style={{
              "margin-bottom": "1em",
            }}
          >
            <Breadcrumb path={routes["/admin"]}>Administration</Breadcrumb>
            <Breadcrumb path={USER_GROUPS_ROUTE}>Groups</Breadcrumb>
            <Breadcrumb path={`${USER_GROUPS_ROUTE}/${$userGroup.data!.id}`}>
              {$userGroup.data!.name}
            </Breadcrumb>
          </Breadcrumbs>

          <Stack spacing="2em">
            <Stack
              direction="row"
              justifyContent="space-between"
              alignItems="center"
            >
              <Stack spacing={"0.5em"}>
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
                <Switch>
                  <Match
                    when={
                      $userGroup.data?.group_type === userGroupType.everyone
                    }
                  >
                    <Text fontSize={"var(--text-sm)"}>
                      <Pill>
                        <Stack
                          direction="row"
                          alignItems="center"
                          spacing={"0.25em"}
                        >
                          <Icon name="settings" size={12} wght={500} />
                          <span>System group</span>
                        </Stack>
                      </Pill>
                    </Text>
                  </Match>
                  <Match
                    when={$userGroup.data?.group_type === userGroupType.user}
                  >
                    <Text fontSize={"var(--text-sm)"}>
                      <Pill>
                        <Stack
                          direction="row"
                          alignItems="center"
                          spacing={"0.25em"}
                        >
                          <Icon name="settings" size={12} wght={500} />
                          <span>System group</span>
                        </Stack>
                      </Pill>
                    </Text>
                  </Match>
                </Switch>
              </Stack>

              <Show
                when={
                  groupManagementPermissions().groupDeletionAllowed &&
                  $userGroup.data?.group_type === null
                }
              >
                <ExpandButton icon="bolt" label="Actions" position="left">
                  <ExpandButtonEntries>
                    <ExpandButtonEntry
                      icon="delete"
                      variant="danger"
                      onClick={() => setDeleteConfirmationModalOpen(true)}
                    >
                      Delete
                    </ExpandButtonEntry>
                  </ExpandButtonEntries>
                </ExpandButton>
              </Show>
            </Stack>

            <Show
              when={
                groupManagementPermissions().groupManagementAllowed &&
                $userGroup.data?.group_type === null
              }
            >
              <Text variant="h3">General Information</Text>

              <KeyValueFields
                style={{
                  width: "500px",
                }}
              >
                <KeyValue
                  keyWidth="100px"
                  label="Group name"
                  value={$userGroup.data?.name ?? ""}
                  onChange={(value) => saveKeyValue("name", value)}
                />
              </KeyValueFields>
            </Show>

            <Text variant="h3">Group Rights</Text>

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
                                disabled={
                                  !groupManagementPermissions()
                                    .groupManagementAllowed
                                }
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
                      onClick={() => navigate(USER_GROUPS_ROUTE)}
                    >
                      Back
                    </Button>
                    <Stack direction="row" spacing="1em">
                      <Show
                        when={
                          groupManagementPermissions().groupManagementAllowed
                        }
                      >
                        <Button
                          disabled={$updateUserGroup.isLoading}
                          onClick={() => setUpdateConfirmationModalOpen(true)}
                        >
                          Save changes
                        </Button>
                      </Show>
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
