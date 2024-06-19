import {
  Accessor,
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

export type SelectProps<
  IsMulti extends true | false,
  TOption extends SelectOption
> = Partial<InputErrorProps> & {
  options: SelectOption[]

  label?: string
  subtext?: JSX.Element

  width?: string

  disabled?: boolean
} & (IsMulti extends false
    ? {
        multi: false
        value: Accessor<TOption["id"]>
        onChange: (value: TOption["id"]) => void
      }
    : {
        multi: true
        value: Accessor<Array<TOption["id"]> | null>
        onChange: (value: Array<TOption["id"]> | null) => void
      })

export const SelectField = <
  IsMulti extends true | false,
  TOption extends SelectOption
>(
  props: SelectProps<IsMulti, TOption>
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
    if (props.multi) {
      if (props.value() === null) {
        props.onChange([id])
      } else {
        if (props.value()!.includes(id)) {
          props.onChange(props.value()!.filter((v) => v !== id))
        } else {
          props.onChange([...props.value()!, id])
        }
      }
    } else {
      props.onChange(id)

      setActive(false)
    }
  }

  createEffect(() => {
    if (!props.value() && props.multi) {
      props.onChange([])
    }
  })

  return (
    <div
      classList={{
        "ui-select-field": true,
        active: active(),
        disabled: props.disabled,
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

      <div classList={{ field: true, multi: props.multi }}>
        <div class="container" onClick={toggleActive}>
          <div class="selected-options">
            <Show
              when={props.multi}
              fallback={
                <div class="single-option">
                  {
                    // prettier-ignore
                    props.multi
                    ? ""
                    : (props.value()
                    ? options()[props.value()!]?.name
                    : "")
                  }
                </div>
              }
            >
              <For each={props.multi ? props.value() : []}>
                {(selectedOptionId) => {
                  const selectedOption = createMemo(
                    () => options()[selectedOptionId]
                  )

                  return (
                    <button
                      type="button"
                      classList={{
                        option: true,
                        unknown: !selectedOption(),
                      }}
                      onClick={() => toggleOption(selectedOptionId)}
                    >
                      {selectedOption()?.name ?? "(unknown) "}
                    </button>
                  )
                }}
              </For>
            </Show>
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
                {(option) => {
                  const selected = createMemo(
                    () => props.value()?.includes(option.id) ?? false
                  )

                  return (
                    <button
                      type="button"
                      classList={{
                        option: true,
                        selected: selected(),
                      }}
                      onClick={() => toggleOption(option.id)}
                    >
                      <input
                        class="checkbox"
                        type="checkbox"
                        checked={selected()}
                      />
                      <div class="name">{option.name}</div>
                    </button>
                  )
                }}
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
