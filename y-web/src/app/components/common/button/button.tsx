/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { JSX, Show } from "solid-js"

import { Icon } from "@/app/components/common/icon/icon"
import { ComponentWithChildren } from "@/module"

import "./button.less"

export type ButtonProps = {
  variant?: "primary" | "secondary" | "text"
  leadingIcon?: string

  disabled?: boolean

  width?: string

  onClick?: (event: MouseEvent) => void

  buttonType?: "button" | "submit" | "reset"

  style?: JSX.CSSProperties
}

export const Button: ComponentWithChildren<ButtonProps> = (props) => {
  return (
    <div
      classList={{
        "ui-button": true,
        [props.variant ?? "primary"]: true,
        disabled: props.disabled,
      }}
    >
      <button
        style={{ width: props.width ?? "auto", ...props.style }}
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
