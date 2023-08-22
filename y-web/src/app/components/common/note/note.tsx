import { JSX } from "solid-js"

import { ComponentWithChildren } from "@/module"

import "./note.less"

export type NoteProps = {
  type: "secondary" | "critical"

  style?: JSX.CSSProperties
}

export const Note: ComponentWithChildren<NoteProps> = (props) => {
  return (
    <div
      classList={{
        "ui-note": true,
        [props.type]: true,
      }}
      style={props.style}
    >
      {props.children}
    </div>
  )
}
