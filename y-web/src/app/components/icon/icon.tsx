/* eslint-disable @typescript-eslint/no-magic-numbers */
import { Component, JSX, mergeProps } from "solid-js"

export type IconProps = {
  name: string

  type?: "outlined" | "rounded" | "sharp"

  size?: number
  fill?: number
  wght?: number
  grad?: number

  style?: JSX.CSSProperties
}

const defaultProps = {
  type: "rounded",
  fill: 0,
  wght: 400,
  grad: -25,
  size: 24,
} as const

export const Icon: Component<IconProps> = (inputProps) => {
  const props = mergeProps(defaultProps, inputProps)

  return (
    <span
      class={`ui-icon material-symbols-${props.type}`}
      style={{
        "user-select": "none",
        "font-size": `${props.size}px`,
        "font-variation-settings": `'FILL' ${props.fill}, 'wght' ${props.wght}, 'GRAD' ${props.grad}, 'opsz' ${props.size}`,
        ...props.style,
      }}
    >
      {props.name}
    </span>
  )
}
