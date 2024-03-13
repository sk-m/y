import { Component, Show } from "solid-js"

import { Button } from "@/app/components/common/button/button"
import { Icon } from "@/app/components/common/icon/icon"
import { Modal } from "@/app/components/common/modal/modal"
import { Stack } from "@/app/components/common/stack/stack"
import { Text } from "@/app/components/common/text/text"

export type FileExplorerDeleteModalProps = {
  open: boolean
  subtitle?: string

  onClose: () => void
  onConfirm: () => void
}

export const FileExplorerDeleteModal: Component<
  FileExplorerDeleteModalProps
> = (props) => {
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
              Confirm deletion
            </Text>
            <Show when={props.subtitle}>
              <Text variant="secondary" fontWeight={500}>
                {props.subtitle}
              </Text>
            </Show>
          </Stack>
        </Stack>
      }
    >
      <Stack spacing={"1.5em"}>
        <Text>
          Deleting is permanent and cannot be undone. Are you sure you want to
          continue?
        </Text>

        <Stack direction="row" justifyContent="space-between">
          <Button variant="secondary" onClick={props.onClose}>
            Cancel
          </Button>
          <Button onClick={props.onConfirm}>Delete</Button>
        </Stack>
      </Stack>
    </Modal>
  )
}
