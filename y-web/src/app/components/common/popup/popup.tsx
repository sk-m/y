import { ComponentWithChildren } from "@/module"

export type PopupProps = {
  show?: boolean
}

export const Popup: ComponentWithChildren<PopupProps> = (props) => {
  return (
    <div
      classList={{
        "ui-popup": true,
        shown: props.show,
      }}
    >
      <div class="ui-popup-block">
        <div class="content">{props.children}</div>
      </div>
    </div>
  )
}
