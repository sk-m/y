import { JSX, Show } from "solid-js"

import { ComponentWithChildren } from "@/module"

import "./pill.less"

export type PillProps = {
  variant?: "secondary" | "warning" | "success" | "purple"
  dot?: boolean

  style?: JSX.CSSProperties
}

export const Pill: ComponentWithChildren<PillProps> = (props) => {
  return (
    <div
      classList={{
        "ui-pill": true,
        [props.variant ?? "secondary"]: true,
      }}
      style={props.style}
    >
      <Show when={props.dot}>
        <div class="dot" />
      </Show>
      <div class="text">{props.children}</div>
    </div>
  )
}
