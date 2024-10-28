import { Component, Show } from "solid-js"

import { Button } from "@/app/components/common/button/button"
import { Icon } from "@/app/components/common/icon/icon"
import { InputField } from "@/app/components/common/input-field/input-field"
import { Modal } from "@/app/components/common/modal/modal"
import { Stack } from "@/app/components/common/stack/stack"
import { Text } from "@/app/components/common/text/text"
import { useForm } from "@/app/core/use-form"

export type CreateAccessRulesTemplateFormValues = {
  name: string
}

export type CreateAccessRulesTemplateModalProps = {
  defaultValues?: CreateAccessRulesTemplateFormValues
  numOfRules?: number

  open: boolean
  onClose: () => void
  onCreate: (values: CreateAccessRulesTemplateFormValues) => void
}

export const CreateAccessRulesTemplateModal: Component<
  CreateAccessRulesTemplateModalProps
> = (props) => {
  const { register, submit, errors } =
    useForm<CreateAccessRulesTemplateFormValues>({
      defaultValues: {
        name: "",

        ...props.defaultValues,
      },
      onSubmit: (values) => {
        props.onCreate(values)
        props.onClose()
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
            <Icon grad={25} wght={500} size={24} name="library_add" />
          </div>
          <Stack spacing="0.5em">
            <Text
              variant="h2"
              style={{
                margin: 0,
              }}
              color="var(--color-text-grey-025)"
            >
              New access template
            </Text>
            <Show when={props.numOfRules}>
              <Text variant="secondary" fontWeight={500}>
                {props.numOfRules} rules
              </Text>
            </Show>
          </Stack>
        </Stack>
      }
    >
      <Stack spacing={"1.5em"}>
        {/* <Text></Text> */}

        <form onSubmit={submit}>
          <InputField
            label="Template name"
            width="100%"
            error={errors().name}
            maxLength={127}
            {...register("name", {
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
            <Button buttonType="submit">Create</Button>
          </Stack>
        </form>
      </Stack>
    </Modal>
  )
}
