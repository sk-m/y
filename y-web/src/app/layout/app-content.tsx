import { ComponentWithChildren } from "@/module"

import "./app-content.less"

export const AppContent: ComponentWithChildren = (props) => {
  return <div id="app-content">{props.children}</div>
}
