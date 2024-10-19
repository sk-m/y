import { Component, Show, createSignal } from "solid-js"

import { useNavigate } from "@solidjs/router"
import { createMutation, useQueryClient } from "@tanstack/solid-query"

import { Button } from "@/app/components/common/button/button"
import { Card } from "@/app/components/common/card/card"
import { Icon } from "@/app/components/common/icon/icon"
import {
  KeyValue,
  KeyValueFields,
} from "@/app/components/common/key-value/key-value"
import { Modal } from "@/app/components/common/modal/modal"
import { Stack } from "@/app/components/common/stack/stack"
import { Text } from "@/app/components/common/text/text"
import { toastCtl } from "@/app/core/toast"
import { genericErrorToast } from "@/app/core/util/toast-utils"
import { routes } from "@/app/routes"
import {
  UpdateUserGroupInput,
  deleteUserGroup,
  updateUserGroup,
} from "@/modules/admin/user-groups/user-groups.api"
import { IUserGroupDetails } from "@/modules/admin/user-groups/user-groups.codecs"
import {
  userGroupKey,
  userGroupsKey,
} from "@/modules/admin/user-groups/user-groups.service"

export type UserGroupGeneralSubpageProps = {
  group: IUserGroupDetails
  groupManagementAllowed: boolean
  groupDeletionAllowed: boolean
}

const USER_GROUPS_ROUTE = routes["/admin/user-groups"]

const UserGroupGeneralSubpage: Component<UserGroupGeneralSubpageProps> = (
  props
) => {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const { notify } = toastCtl

  const $updateUserGroup = createMutation(updateUserGroup)
  const $deleteUserGroup = createMutation(deleteUserGroup)

  const [deleteConfirmationModalOpen, setDeleteConfirmationModalOpen] =
    createSignal(false)

  const saveKeyValue = (key: keyof UpdateUserGroupInput, value: string) => {
    void $updateUserGroup.mutate(
      {
        userGroupId: props.group.id,
        [key]: value,
      },
      {
        onSuccess: () => {
          void queryClient.invalidateQueries([userGroupsKey])
          void queryClient.invalidateQueries([userGroupKey, props.group.id])
        },
        onError: (error) => genericErrorToast(error),
      }
    )
  }

  return (
    <>
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
              color="red"
              onClick={() => {
                $deleteUserGroup.mutate(
                  {
                    userGroupId: props.group.id,
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

      <Stack spacing={"1em"}>
        <Show
          when={props.groupManagementAllowed && props.group.group_type === null}
        >
          <Card>
            <Stack spacing={"1.5em"}>
              <div class="ui-card-label">
                <div class="label-strip" />
                <Text
                  variant="h3"
                  style={{
                    margin: "0",
                  }}
                >
                  General configuration
                </Text>
              </div>

              <KeyValueFields
                textAlign="left"
                style={{
                  width: "500px",
                }}
              >
                <KeyValue
                  keyWidth="100px"
                  label="Group name"
                  value={props.group.name}
                  onChange={(value) => saveKeyValue("name", value)}
                />
              </KeyValueFields>
            </Stack>
          </Card>
        </Show>

        <Show
          when={props.groupDeletionAllowed && props.group.group_type === null}
        >
          <Card>
            <Stack
              direction="row"
              spacing={"1em"}
              justifyContent="space-between"
              alignItems="center"
            >
              <div class="ui-card-label">
                <div class="label-strip" />
                <Stack spacing={"0.33em"}>
                  <Text
                    variant="h3"
                    style={{
                      margin: "0",
                    }}
                  >
                    Delete group
                  </Text>
                  <Text variant="secondary" fontSize={"var(--text-sm)"}>
                    Irreversibly delete this user group and unassign all users.
                  </Text>
                </Stack>
              </div>
              <Button
                leadingIcon="delete"
                onClick={() => setDeleteConfirmationModalOpen(true)}
                color="red"
              >
                Delete group
              </Button>
            </Stack>
          </Card>
        </Show>
      </Stack>
    </>
  )
}

export default UserGroupGeneralSubpage
