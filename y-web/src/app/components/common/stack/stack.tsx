import { JSX } from "solid-js"

import { ComponentWithChildren } from "@/module"

export type StackProps = {
  direction?: JSX.CSSProperties["flex-direction"]
  justifyContent?: JSX.CSSProperties["justify-content"]
  alignItems?: JSX.CSSProperties["align-items"]
  spacing?: JSX.CSSProperties["gap"]

  style?: JSX.CSSProperties
}

export const Stack: ComponentWithChildren<StackProps> = (props) => {
  return (
    <div
      style={{
        display: "flex",
        "flex-direction": props.direction ?? "column",
        "justify-content": props.justifyContent,
        "align-items": props.alignItems,
        gap: props.spacing,

        ...props.style,
      }}
    >
      {props.children}
    </div>
  )
}
