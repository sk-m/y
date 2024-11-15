import { JSX } from "solid-js"

import { ComponentWithChildren } from "@/module"

import "./container.less"

export type ContainerProps = {
  id?: string
  classList?: Record<string, boolean>

  size: "xs" | "s" | "m" | "l" | "xl" | "full"

  style?: JSX.CSSProperties
}

export const Container: ComponentWithChildren<ContainerProps> = (props) => {
  return (
    <div
      id={props.id}
      classList={{
        "ui-container": true,
        [props.size]: true,
        ...props.classList,
      }}
      style={props.style}
    >
      {props.children}
    </div>
  )
}
