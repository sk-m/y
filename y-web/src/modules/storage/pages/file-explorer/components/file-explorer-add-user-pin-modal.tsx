import { Component } from "solid-js"

import { Button } from "@/app/components/common/button/button"
import { Icon } from "@/app/components/common/icon/icon"
import { InputField } from "@/app/components/common/input-field/input-field"
import { Modal } from "@/app/components/common/modal/modal"
import { Stack } from "@/app/components/common/stack/stack"
import { Text } from "@/app/components/common/text/text"
import { useForm } from "@/app/core/use-form"

export type FileExplorerAddPinModalProps = {
  open: boolean

  onClose: () => void
  onConfirm: (name: string) => void
}

export const FileExplorerAddPinModal: Component<
  FileExplorerAddPinModalProps
> = (props) => {
  const { register, submit, errors } = useForm({
    defaultValues: {
      name: "",
    },
    onSubmit: (values) => {
      props.onConfirm(values.name)
    },
  })

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
            <Icon grad={25} wght={500} size={24} name="keep" />
          </div>
          <Stack spacing="0.5em">
            <Text
              variant="h2"
              style={{
                margin: 0,
              }}
              color="var(--color-text-grey-025)"
            >
              Pin to sidebar
            </Text>
            <Text variant="secondary" fontWeight={500}>
              Pin this folder to the sidebar for quick access.
            </Text>
          </Stack>
        </Stack>
      }
    >
      <form onSubmit={submit}>
        <Stack spacing={"1.5em"}>
          <InputField
            width="100%"
            label="Short name"
            inputProps={{
              autofocus: true,
            }}
            error={errors().name}
            {...register("name", {
              required: true,
            })}
          />

          <Stack direction="row" justifyContent="space-between">
            <Button variant="secondary" onClick={props.onClose}>
              Cancel
            </Button>
            <Button buttonType="submit">Pin</Button>
          </Stack>
        </Stack>
      </form>
    </Modal>
  )
}
