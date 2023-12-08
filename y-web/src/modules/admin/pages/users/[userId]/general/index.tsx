import { Component, createSignal } from "solid-js"

import { Button } from "@/app/components/common/button/button"
import { Card } from "@/app/components/common/card/card"
import { Stack } from "@/app/components/common/stack/stack"
import { AdminUpdateUserPasswordModal } from "@/modules/admin/components/user/update-user-password-modal"
import { IUser } from "@/modules/admin/user/user.codecs"

export type UserGeneralSubpageProps = {
  user: IUser
}

const UserGeneralSubpage: Component<UserGeneralSubpageProps> = (props) => {
  const [updatePasswordModalOpen, setUpdatePasswordModalOpen] =
    createSignal(false)

  return (
    <>
      <AdminUpdateUserPasswordModal
        user={props.user}
        open={Boolean(updatePasswordModalOpen())}
        onClose={() => setUpdatePasswordModalOpen(false)}
      />

      <Stack>
        <Card>
          <Button
            leadingIcon="key"
            onClick={() => setUpdatePasswordModalOpen(true)}
          >
            Update user's password
          </Button>
        </Card>
      </Stack>
    </>
  )
}

export default UserGeneralSubpage
