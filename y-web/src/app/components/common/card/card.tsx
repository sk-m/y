import { JSX } from "solid-js"

import { ComponentWithChildren } from "@/module"

import "./card.less"

export type CardProps = {
  style?: JSX.CSSProperties
}

export const Card: ComponentWithChildren<CardProps> = (props) => {
  return (
    <div class="ui-card" style={props.style}>
      <div class="ui-card-content">{props.children}</div>
    </div>
  )
}
