import { Component, Show, createEffect, createSignal, onMount } from "solid-js"

import { Icon } from "../icon/icon"
import "./checkbox.less"

export type CheckboxProps = {
  onChange?: (checked: boolean) => void

  /** Use if you want this checkbox to be uncontrolled. */
  ref?: HTMLInputElement | ((inputRef: HTMLInputElement) => unknown)

  /** Use if you want this checkbox to be controlled. */
  value?: boolean

  checkedLabel?: string
  size?: "m" | "l"
}

export const Checkbox: Component<CheckboxProps> = (props) => {
  // eslint-disable-next-line solid/reactivity, no-undefined
  const isControlled = props.value !== undefined

  let ref: HTMLInputElement

  const [checked, setChecked] = createSignal(
    // eslint-disable-next-line solid/reactivity, no-undefined
    props.value === undefined ? false : props.value
  )

  onMount(() => {
    if (!isControlled) {
      setChecked(ref.checked)
      ref.addEventListener("change", () => {
        setChecked(ref.checked)
      })
    }
  })

  createEffect(() => {
    if (!isControlled) {
      props.onChange?.(checked())
    }
  })

  const toggle = () => {
    if (isControlled) {
      setChecked((value) => !value)

      ref.checked = checked()
      props.onChange?.(checked())
    } else {
      ref.checked = !ref.checked
    }

    ref.dispatchEvent(new Event("change", { bubbles: true }))
  }

  return (
    <div classList={{ "ui-checkbox-container": true, checked: checked() }}>
      <input
        type="checkbox"
        hidden
        ref={(inputRef) => {
          ref = inputRef
          if (typeof props.ref === "function") {
            props.ref(inputRef)
          } else {
            // eslint-disable-next-line solid/reactivity
            props.ref = inputRef
          }
        }}
      />
      <button
        type="button"
        onClick={toggle}
        classList={{
          "ui-checkbox": true,
          [props.size ?? "m"]: true,
          checked: checked(),
        }}
      >
        <Icon name="check" wght={100} size={18} grad={-25} />
      </button>
      <Show when={props.checkedLabel}>
        <div class="checked-label">{props.checkedLabel}</div>
      </Show>
    </div>
  )
}
