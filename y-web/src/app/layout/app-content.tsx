import { ComponentWithChildren } from "@/module"

import "./app-content.less"

export type AppContentProps = {
  noShadows?: boolean
}

export const AppContent: ComponentWithChildren<AppContentProps> = (props) => {
  return (
    <div id="app-content-container">
      <div
        id="app-content"
        classList={{
          "no-shadows": props.noShadows,
        }}
      >
        {props.children}
      </div>
    </div>
  )
}
