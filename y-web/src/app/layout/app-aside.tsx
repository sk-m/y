import { ComponentWithChildren } from "@/module"

import "./app-aside.less"

export const AppAside: ComponentWithChildren = (props) => {
  return <div id="app-aside">{props.children}</div>
}
