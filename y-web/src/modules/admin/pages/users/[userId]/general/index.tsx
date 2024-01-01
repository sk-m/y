import { Component, Show, createMemo, createSignal } from "solid-js"

import { Button } from "@/app/components/common/button/button"
import { Card } from "@/app/components/common/card/card"
import { Stack } from "@/app/components/common/stack/stack"
import { AdminUpdateUserPasswordModal } from "@/modules/admin/components/user/update-user-password-modal"
import { IUser } from "@/modules/admin/user/user.codecs"
import { useAuth } from "@/modules/core/auth/auth.service"

export type UserGeneralSubpageProps = {
  user: IUser
}

const UserGeneralSubpage: Component<UserGeneralSubpageProps> = (props) => {
  const $auth = useAuth()

  const passwordUpdateAllowed = createMemo(
    () =>
      $auth.data?.user_rights.some(
        (right) => right.right_name === "change_user_password"
      ) ?? false
  )

  const [updatePasswordModalOpen, setUpdatePasswordModalOpen] =
    createSignal(false)

  return (
    <>
      <AdminUpdateUserPasswordModal
        user={props.user}
        open={passwordUpdateAllowed() && updatePasswordModalOpen()}
        onClose={() => setUpdatePasswordModalOpen(false)}
      />

      <Stack>
        <Show when={passwordUpdateAllowed()}>
          <Card>
            <Button
              leadingIcon="key"
              onClick={() => setUpdatePasswordModalOpen(true)}
            >
              Update user's password
            </Button>
          </Card>
        </Show>
      </Stack>
    </>
  )
}

export default UserGeneralSubpage
