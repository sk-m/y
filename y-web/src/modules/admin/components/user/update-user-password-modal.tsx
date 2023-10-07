import { Component } from "solid-js"

import { createMutation } from "@tanstack/solid-query"

import { Button } from "@/app/components/common/button/button"
import { Icon } from "@/app/components/common/icon/icon"
import { InputField } from "@/app/components/common/input-field/input-field"
import { Modal } from "@/app/components/common/modal/modal"
import { Stack } from "@/app/components/common/stack/stack"
import { Text } from "@/app/components/common/text/text"
import { useForm } from "@/app/core/use-form"
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

export const AdminUpdateUserPasswordModal: Component<
  AdminUpdateUserPasswordModalProps
> = (props) => {
  const $updatePassword = createMutation(updateUserPassword)

  const form = useForm<AdminUpdateUserPasswordFormValues>({
    defaultValues: {
      newPassword: "",

      ...props.defaultValues,
    },
    onSubmit: (values) => {
      if (!props.user) return

      $updatePassword.mutate(
        {
          userId: props.user.id,
          password: values.newPassword,
        },
        {
          onSuccess: () => {
            props.onClose()
          },
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
    >
      <Stack spacing={"1.5em"}>
        <Text
          variant="h2"
          style={{
            margin: 0,
          }}
        >
          Update password
        </Text>

        <Text>
          <div
            style={{
              display: "inline-flex",
              "align-items": "center",
              gap: "0.33em",
            }}
          >
            <span>Setting a new password for</span>
            <Icon name="person" size={16} type="rounded" />
            <code
              style={{
                "font-weight": "500",
              }}
            >
              {props.user?.username}
            </code>
          </div>
          .
        </Text>

        <Text>
          New password will not be sent to the user, don't forget to write it
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
