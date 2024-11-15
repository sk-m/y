import { ComponentWithChildren } from "@/module"

import "./app-content.less"
import { AppErrorBoundary } from "./components/app-error-boundary"

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
        <AppErrorBoundary>{props.children}</AppErrorBoundary>
      </div>
    </div>
  )
}
