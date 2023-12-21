/* eslint-disable @typescript-eslint/no-non-null-assertion */
import {
  Accessor,
  Component,
  For,
  JSX,
  Show,
  createEffect,
  createMemo,
  createSignal,
} from "solid-js"

import { Icon } from "../icon/icon"
import { InputError, InputErrorProps } from "../input-error/input-error"
import { Text } from "../text/text"
import "./select-field.less"

export type SelectOption = {
  name: string
  id: string
}

export type SelectProps<TOption extends SelectOption = SelectOption> =
  Partial<InputErrorProps> & {
    options: SelectOption[]

    value: Accessor<Array<TOption["id"]> | null>
    onChange: (values: Array<TOption["id"]>) => void

    label?: string
    subtext?: JSX.Element

    width?: string
  }

export const SelectField: Component<SelectProps> = <
  TOption extends SelectOption = SelectOption
>(
  props: SelectProps<TOption>
) => {
  const [active, setActive] = createSignal(false)

  const options = createMemo(() => {
    const newOptions: Record<string, SelectOption> = {}

    for (const option of props.options) {
      newOptions[option.id] = option
    }

    return newOptions
  })

  const toggleActive = () => setActive((state) => !state)

  const toggleOption = (id: string) => {
    if (props.value() === null) {
      props.onChange([id])
    } else {
      if (props.value()!.includes(id)) {
        props.onChange(props.value()!.filter((v) => v !== id))
      } else {
        props.onChange([...props.value()!, id])
      }
    }
  }

  createEffect(() => {
    if (!props.value()) {
      props.onChange([])
    }
  })

  return (
    <div
      classList={{
        "ui-select-field": true,
        active: active(),
      }}
      style={{
        ...(props.width ? { width: props.width } : {}),
      }}
    >
      <Show when={props.label}>
        <Text
          fontSize={"var(--text-sm)"}
          color="var(--color-text-grey-05)"
          variant="secondary"
          style={{
            "margin-bottom": "0.25em",
          }}
        >
          {props.label}
        </Text>
      </Show>

      <div class="field">
        <div class="container" onClick={toggleActive}>
          <div class="selected-options">
            <For each={props.value()}>
              {(selectedOptionId) => (
                <button
                  type="button"
                  class="option"
                  onClick={() => toggleOption(selectedOptionId)}
                >
                  {options()[selectedOptionId]?.name}
                </button>
              )}
            </For>
          </div>

          <div class="floater">
            <div class="expand-button">
              <Icon
                name={active() ? "expand_less" : "expand_more"}
                size={16}
                wght={500}
              />
            </div>
          </div>
        </div>

        <div class="expand-floater">
          <div class="panel">
            <div class="available-options">
              <For each={props.options}>
                {(option) => (
                  <button
                    type="button"
                    classList={{
                      option: true,
                      selected: props.value()?.includes(option.id),
                    }}
                    onClick={() => toggleOption(option.id)}
                  >
                    <div class="name">{option.name}</div>
                  </button>
                )}
              </For>
            </div>
          </div>
        </div>
      </div>

      <Show when={props.error && typeof props.error === "string"}>
        <InputError error={props.error} />
      </Show>

      <Show when={props.subtext}>
        <div class="input-subtext">{props.subtext}</div>
      </Show>
    </div>
  )
}
