import { Component } from "solid-js"

import { createMutation } from "@tanstack/solid-query"

import { Button } from "@/app/components/common/button/button"
import { Icon } from "@/app/components/common/icon/icon"
import { InputField } from "@/app/components/common/input-field/input-field"
import { Modal } from "@/app/components/common/modal/modal"
import { Stack } from "@/app/components/common/stack/stack"
import { Text } from "@/app/components/common/text/text"
import { toastCtl } from "@/app/core/toast"
import { useForm } from "@/app/core/use-form"
import { genericErrorToast } from "@/app/core/util/toast-utils"
import { updateUserPassword } from "@/modules/admin/users/users.api"

import { IUser } from "../../users/users.codecs"

export type AdminUpdateUserPasswordFormValues = {
  newPassword: string
}

export type AdminUpdateUserPasswordModalProps = {
  defaultValues?: AdminUpdateUserPasswordFormValues

  user: IUser | null
  open: boolean
  onClose: () => void
}

// TODO Move change password logic out of the component
export const AdminUpdateUserPasswordModal: Component<
  AdminUpdateUserPasswordModalProps
> = (props) => {
  const { notify } = toastCtl

  const $updatePassword = createMutation(updateUserPassword)

  const form = useForm<AdminUpdateUserPasswordFormValues>({
    defaultValues: {
      newPassword: "",

      ...props.defaultValues,
    },
    disabled: () => $updatePassword.isLoading,
    onSubmit: (values) => {
      if (!props.user) return

      $updatePassword.mutate(
        {
          userId: props.user.id,
          password: values.newPassword,
        },
        {
          onSuccess: () => {
            notify({
              title: "Password updated",
              content: "User's password was changed",
              severity: "success",
              icon: "check",
            })

            props.onClose()
          },
          onError: (error) => genericErrorToast(error),
        }
      )
    },
  })

  const { register, submit, errors } = form

  return (
    <Modal
      open={props.open}
      onClose={props.onClose}
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
            <Icon grad={25} wght={500} size={24} name="password" />
          </div>
          <Stack spacing="0.5em">
            <Text
              variant="h2"
              style={{
                margin: 0,
              }}
              color="var(--color-text-grey-025)"
            >
              Change password
            </Text>
            <Text variant="secondary" fontWeight={500}>
              {props.user?.username}
            </Text>
          </Stack>
        </Stack>
      }
    >
      <Stack spacing={"1.5em"}>
        <Text>
          New password will not be sent to the user. Don't forget to write it
          down.
        </Text>

        <form onSubmit={submit}>
          <input hidden name="username" autocomplete="username" />

          <InputField
            label="New Password"
            width="100%"
            type="password"
            monospace
            inputProps={{
              autocomplete: "new-password",
            }}
            error={errors().newPassword}
            {...register("newPassword", {
              required: true,
            })}
          />

          <Stack
            direction="row"
            justifyContent="space-between"
            style={{
              "margin-top": "1.5em",
            }}
          >
            <Button variant="secondary" onClick={props.onClose}>
              Cancel
            </Button>
            <Button buttonType="submit" disabled={$updatePassword.isLoading}>
              {$updatePassword.isLoading ? "Confirm..." : "Confirm"}
            </Button>
          </Stack>
        </form>
      </Stack>
    </Modal>
  )
}
