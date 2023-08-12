/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { Component, JSX, Show, createSignal, onMount } from "solid-js"

import {
  InputError,
  InputErrorProps,
} from "@/app/components/common/input-error/input-error"

import "./input-field.less"

export type InputFieldProps = Partial<InputErrorProps> & {
  ref?: HTMLInputElement | ((inputRef: HTMLInputElement) => unknown)
  type?: string

  disabled?: boolean

  label?: string
  placeholder?: string
  subtext?: JSX.Element

  monospace?: boolean

  width?: string
  fixedHeight?: boolean

  inputProps?: JSX.InputHTMLAttributes<HTMLInputElement>
}

export const InputField: Component<InputFieldProps> = (props) => {
  const [isFocused, setIsFocused] = createSignal(false)
  const [value, setValue] = createSignal("")

  let ref: HTMLInputElement

  onMount(() => {
    setValue(ref.value)

    ref.addEventListener("input", () => {
      setValue(ref.value)
    })
  })

  return (
    <div
      classList={{
        "ui-input-field": true,
        focused: isFocused(),
        dirty: Boolean(value()),
        monospace: props.monospace,
        disabled: props.disabled,
        error: Boolean(props.error),
        "fixed-height": props.fixedHeight,
        "no-label": !props.label,
      }}
      style={{
        width: props.width ?? "200px",
      }}
    >
      <div class="container">
        <Show when={props.label}>
          <div class="input-label">{props.label}</div>
        </Show>
        <input
          {...props.inputProps}
          ref={(inputRef) => {
            ref = inputRef
            if (typeof props.ref === "function") {
              props.ref(inputRef)
            } else {
              // eslint-disable-next-line solid/reactivity
              props.ref = inputRef
            }
          }}
          type={props.type ?? "text"}
          disabled={props.disabled}
          placeholder={props.placeholder}
          onFocus={[setIsFocused, true]}
          onBlur={[setIsFocused, false]}
        />
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
