import { JSX } from "solid-js"

import { ComponentWithChildren } from "@/module"

import "./container.less"

export type ContainerProps = {
  id?: string

  size: "s" | "m" | "l" | "xl"

  style?: JSX.CSSProperties
}

export const Container: ComponentWithChildren<ContainerProps> = (props) => {
  return (
    <div
      id={props.id}
      classList={{
        "ui-container": true,
        [props.size]: true,
      }}
      style={props.style}
    >
      {props.children}
    </div>
  )
}
