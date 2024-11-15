import { ErrorBoundary } from "solid-js"

import { Icon } from "@/app/components/common/icon/icon"
import { ComponentWithChildren } from "@/module"

export type AppErrorBoundaryProps = {
  message?: string
}

export const AppErrorBoundary: ComponentWithChildren<AppErrorBoundaryProps> = (
  props
) => {
  return (
    <ErrorBoundary
      fallback={(_, reset) => (
        <div class="app-error-boundary">
          <div class="error-message">
            <Icon
              name="sentiment_very_dissatisfied"
              fill={1}
              wght={600}
              size={32}
            />
            <div class="text">
              <div class="title">Ooops...</div>
              <div class="message">
                {props.message ??
                  "Something went wrong. Are you sure you are allowed to access this page?"}
              </div>
            </div>
            <div class="buttons">
              <button onClick={reset}>Try again</button>
            </div>
          </div>
        </div>
      )}
    >
      {props.children}
    </ErrorBoundary>
  )
}
