import { JSX } from "solid-js"

import { ComponentWithChildren } from "@/module"

import "./pill.less"

export type PillProps = {
  variant?: "secondary" | "info"

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
      {props.children}
    </div>
  )
}
