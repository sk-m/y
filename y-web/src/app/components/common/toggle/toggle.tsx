import { Component, createEffect, createSignal, onMount } from "solid-js"

import "./toggle.less"

export type ToggleProps = {
  onChange?: (toggled: boolean) => void

  /** Use if you want this toggle to be uncontrolled. */
  ref?: HTMLInputElement | ((inputRef: HTMLInputElement) => unknown)

  /** Use if you want this toggle to be controlled. */
  value?: boolean

  size?: "m" | "l"

  disabled?: boolean
}

export const Toggle: Component<ToggleProps> = (props) => {
  // eslint-disable-next-line solid/reactivity, no-undefined
  const isControlled = props.value !== undefined

  let ref: HTMLInputElement

  const [toggled, setToggled] = createSignal(
    // eslint-disable-next-line solid/reactivity, no-undefined
    props.value === undefined ? false : props.value
  )

  onMount(() => {
    if (!isControlled) {
      setToggled(ref.checked)
      ref.addEventListener("change", () => {
        setToggled(ref.checked)
      })
    }
  })

  createEffect(() => {
    if (!isControlled) {
      props.onChange?.(toggled())
    }
  })

  const toggle = () => {
    if (props.disabled) return

    if (isControlled) {
      setToggled((value) => !value)

      ref.checked = toggled()
      props.onChange?.(toggled())
    } else {
      ref.checked = !ref.checked
    }

    ref.dispatchEvent(new Event("change", { bubbles: true }))
  }

  return (
    <div
      classList={{
        "ui-toggle-container": true,
        [`size-${props.size ?? "m"}`]: true,
        toggled: toggled(),
        disabled: props.disabled,
      }}
    >
      <input
        type="checkbox"
        hidden
        disabled={props.disabled}
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
          "ui-toggle": true,
          toggled: toggled(),
        }}
      >
        <div class="circle" />
      </button>
    </div>
  )
}
