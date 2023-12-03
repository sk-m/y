import { Component, Show, createSignal, onMount } from "solid-js"

import { Icon } from "../icon/icon"
import "./checkbox.less"

export type CheckboxProps = {
  ref?: HTMLInputElement | ((inputRef: HTMLInputElement) => unknown)

  checkedLabel?: string
  size?: "m" | "l"
}

export const Checkbox: Component<CheckboxProps> = (props) => {
  const [checked, setChecked] = createSignal(false)

  let ref: HTMLInputElement

  onMount(() => {
    setChecked(ref.checked)

    ref.addEventListener("change", () => {
      setChecked(ref.checked)
    })
  })

  const toggle = () => {
    ref.checked = !ref.checked
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
