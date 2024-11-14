import { JSX, Show } from "solid-js"

import { Button } from "@/app/components/common/button/button"
import { Stack } from "@/app/components/common/stack/stack"
import { ComponentWithChildren } from "@/module"

export type ConfigSectionProps = {
  title: string
  description?: JSX.Element
}

export const ConfigSection: ComponentWithChildren<ConfigSectionProps> = (
  props
) => {
  return (
    <div class="config-section">
      <div class="section-header">
        <div class="title">{props.title}</div>
        <Show when={props.description}>
          <div class="description">{props.description!}</div>
        </Show>
      </div>
      <div class="section-content">{props.children}</div>
    </div>
  )
}

export type ConfigInputFieldWrapperProps = {
  isDirty: boolean
  resetField: () => void
}

export const ConfigInputFieldWrapper: ComponentWithChildren<
  ConfigInputFieldWrapperProps
> = (props) => {
  return (
    <Stack direction="row" spacing={"1em"}>
      {props.children}
      <Show when={props.isDirty}>
        <Button
          variant="text"
          leadingIcon="refresh"
          size="sm"
          onClick={props.resetField}
        >
          Undo
        </Button>
      </Show>
    </Stack>
  )
}
