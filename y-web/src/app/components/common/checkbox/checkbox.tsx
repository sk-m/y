import {
  Component,
  Show,
  createEffect,
  createSignal,
  onCleanup,
  onMount,
} from "solid-js"

import { Icon } from "../icon/icon"
import "./checkbox.less"

export type CheckboxProps = {
  onChange?: (checked: boolean, event?: MouseEvent) => void

  /** Use if you want this checkbox to be uncontrolled. */
  ref?: HTMLInputElement | ((inputRef: HTMLInputElement) => unknown)

  /** Use if you want this checkbox to be controlled. */
  value?: boolean

  checkedLabel?: string
  size?: "m" | "l"

  disabled?: boolean
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
      const handler = () => {
        setChecked(ref.checked)
      }

      handler()

      ref.addEventListener("change", handler)

      onCleanup(() => {
        ref.removeEventListener("change", handler)
      })
    }
  })

  createEffect(() => {
    if (!isControlled) {
      props.onChange?.(checked())
    }
  })

  createEffect(() => {
    if (isControlled) {
      setChecked(props.value!)
    }
  })

  const toggle = (event: MouseEvent) => {
    if (props.disabled) return

    if (isControlled) {
      setChecked((value) => !value)

      ref.checked = checked()
      props.onChange?.(checked(), event)
    } else {
      ref.checked = !ref.checked
    }

    ref.dispatchEvent(new Event("change", { bubbles: true }))
  }

  return (
    <div
      classList={{
        "ui-checkbox-container": true,
        checked: checked(),
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
