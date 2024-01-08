import { Component, Show, createMemo, createSignal } from "solid-js"

import { useNavigate } from "@solidjs/router"
import { createMutation, useQueryClient } from "@tanstack/solid-query"

import { Button } from "@/app/components/common/button/button"
import { Card } from "@/app/components/common/card/card"
import { Icon } from "@/app/components/common/icon/icon"
import { Modal } from "@/app/components/common/modal/modal"
import { Stack } from "@/app/components/common/stack/stack"
import { Text } from "@/app/components/common/text/text"
import { toastCtl } from "@/app/core/toast"
import { genericErrorToast } from "@/app/core/util/toast-utils"
import { routes } from "@/app/routes"
import { AdminUpdateUserPasswordModal } from "@/modules/admin/components/user/update-user-password-modal"
import { IUser } from "@/modules/admin/user/user.codecs"
import { deleteUsers } from "@/modules/admin/users/users.api"
import { usersKey } from "@/modules/admin/users/users.service"
import { useAuth } from "@/modules/core/auth/auth.service"

export type UserGeneralSubpageProps = {
  user: IUser
}

const UserGeneralSubpage: Component<UserGeneralSubpageProps> = (props) => {
  const $auth = useAuth()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const { notify } = toastCtl

  const $deleteUsers = createMutation(deleteUsers)

  const passwordUpdateAllowed = createMemo(
    () =>
      $auth.data?.user_rights.some(
        (right) => right.right_name === "change_user_password"
      ) ?? false
  )

  const deleteAllowed = createMemo(
    () =>
      $auth.data?.user_rights.some(
        (right) => right.right_name === "delete_user"
      ) ?? false
  )

  const [updatePasswordModalOpen, setUpdatePasswordModalOpen] =
    createSignal(false)

  const [deleteModalOpen, setDeleteModalOpen] = createSignal(false)

  return (
    <>
      <Modal
        open={deleteModalOpen()}
        keepMounted
        onClose={() => setDeleteModalOpen(false)}
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
              <Icon grad={25} wght={500} size={24} name="delete" />
            </div>
            <Stack spacing="0.5em">
              <Text
                variant="h2"
                style={{
                  margin: 0,
                }}
                color="var(--color-text-grey-025)"
              >
                Delete user
              </Text>
              <Text variant="secondary" fontWeight={500}>
                {props.user.username}
              </Text>
            </Stack>
          </Stack>
        }
      >
        <Stack spacing={"1.5em"}>
          <Text>Are you sure you want to delete this user?</Text>

          <Text>
            This action is irreversible. All data associated with the user will
            be deleted forever.
          </Text>

          <Stack direction="row" justifyContent="space-between">
            <Button
              variant="secondary"
              onClick={() => setDeleteModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              disabled={$deleteUsers.isLoading}
              onClick={() => {
                $deleteUsers.mutate(
                  {
                    userIds: [props.user.id],
                  },
                  {
                    onSuccess: () => {
                      notify({
                        title: "User deleted",
                        content: "User was successfully deleted",
                        severity: "success",
                        icon: "check",
                      })

                      setDeleteModalOpen(false)
                      void queryClient.invalidateQueries([usersKey])
                      navigate(routes["/admin/users"])
                    },
                    onError: (error) => genericErrorToast(error),
                  }
                )
              }}
            >
              {$deleteUsers.isLoading ? "Deleting..." : "Delete"}
            </Button>
          </Stack>
        </Stack>
      </Modal>

      <AdminUpdateUserPasswordModal
        user={props.user}
        open={passwordUpdateAllowed() && updatePasswordModalOpen()}
        onClose={() => setUpdatePasswordModalOpen(false)}
      />

      <Stack>
        <Show when={passwordUpdateAllowed() || deleteAllowed()}>
          <Card>
            <Stack direction="row" spacing={"1em"}>
              <Show when={passwordUpdateAllowed()}>
                <Button
                  leadingIcon="key"
                  onClick={() => setUpdatePasswordModalOpen(true)}
                >
                  Update user's password
                </Button>
              </Show>
              <Show when={deleteAllowed()}>
                <Button
                  leadingIcon="delete"
                  onClick={() => setDeleteModalOpen(true)}
                >
                  Delete user
                </Button>
              </Show>
            </Stack>
          </Card>
        </Show>
      </Stack>
    </>
  )
}

export default UserGeneralSubpage
