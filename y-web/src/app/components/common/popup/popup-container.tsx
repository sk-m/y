import { ComponentWithChildren } from "@/module"

import "./popup.less"

export const PopupContainer: ComponentWithChildren = (props) => {
  return <div class="ui-popup-container">{props.children}</div>
}
