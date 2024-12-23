import { JSX, Show } from "solid-js"

import { Icon } from "@/app/components/common/icon/icon"
import { ComponentWithChildren } from "@/module"

import "./button.less"

export type ButtonProps = {
  variant?: "primary" | "secondary" | "text"
  size?: "md" | "sm" | "xs" | "xs-squared"
  leadingIcon?: string
  color?: "primary" | "red" | "blue"
  textColor?: "primary" | "secondary"
  title?: string

  disabled?: boolean

  width?: string

  onClick?: (event: MouseEvent) => void

  buttonType?: "button" | "submit" | "reset"

  style?: JSX.CSSProperties
}

export const Button: ComponentWithChildren<ButtonProps> = (props) => {
  return (
    <div
      title={props.title}
      classList={{
        "ui-button": true,
        [props.size ?? "md"]: true,
        [props.variant ?? "primary"]: true,
        disabled: props.disabled,
        [`color-${props.color ?? "primary"}`]: true,
        [`text-color-${props.textColor ?? "primary"}`]: true,
      }}
      style={{ width: props.width ?? "auto" }}
    >
      <button
        disabled={props.disabled}
        style={props.style}
        type={props.buttonType ?? "button"}
        onClick={(event) => props.onClick?.(event)}
      >
        <div class="content-wrapper">
          <Show when={props.leadingIcon}>
            <Icon size={16} grad={0} name={props.leadingIcon!} />
          </Show>
          <Show when={props.children}>
            <div>{props.children}</div>
          </Show>
        </div>
      </button>
    </div>
  )
}
