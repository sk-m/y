import { ComponentWithChildren } from "@/module"

export type PopupProps = {
  show?: boolean
  xPosition: "left" | "right"
  yPosition: "top" | "bottom"
}

export const Popup: ComponentWithChildren<PopupProps> = (props) => {
  return (
    <div
      classList={{
        "ui-popup": true,
        shown: props.show,
      }}
      style={{
        ...(props.xPosition === "left"
          ? { left: 0 }
          : { left: "100%", "margin-left": "1em" }),
        ...(props.yPosition === "top"
          ? { top: "unset", bottom: "100%", "margin-bottom": "1em" }
          : { top: "100%", bottom: "unset", "margin-top": "1em" }),
      }}
    >
      <div class="ui-popup-block">
        <div class="content">{props.children}</div>
      </div>
    </div>
  )
}
