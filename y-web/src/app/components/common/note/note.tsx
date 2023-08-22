import { ComponentWithChildren } from "@/module"

import "./note.less"

export type NoteProps = {
  type: "secondary" | "critical"
}

export const Note: ComponentWithChildren<NoteProps> = (props) => {
  return (
    <div
      classList={{
        "ui-note": true,
        [props.type]: true,
      }}
    >
      {props.children}
    </div>
  )
}
