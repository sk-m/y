import { ComponentWithChildren } from "@/module"

export type PopupProps = {
  show?: boolean
  position: "left" | "right"
}

export const Popup: ComponentWithChildren<PopupProps> = (props) => {
  return (
    <div
      classList={{
        "ui-popup": true,
        shown: props.show,
      }}
      style={props.position === "left" ? { left: 0 } : { right: 0 }}
    >
      <div class="ui-popup-block">
        <div class="content">{props.children}</div>
      </div>
    </div>
  )
}
