import { Show } from "solid-js"
import { Portal } from "solid-js/web"

import { Card, CardProps } from "@/app/components/common/card/card"
import { ComponentWithChildren } from "@/module"

export type ModalProps = {
  open: boolean
  onClose: () => void

  keepMounted?: boolean
  style?: CardProps["style"]
}

export const Modal: ComponentWithChildren<ModalProps> = (props) => {
  return (
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    <Portal mount={document.getElementById("app-modals-container")!}>
      <div
        classList={{ "ui-modal-container": true, open: props.open }}
        onClick={() => props.onClose()}
      >
        <Show when={props.keepMounted || props.open}>
          <div
            classList={{ "ui-modal": true }}
            onClick={(event) => event.stopPropagation()}
          >
            <Card
              style={{
                width: "100%",
                padding: "1.66em",
                ...props.style,
              }}
            >
              {props.children}
            </Card>
          </div>
        </Show>
      </div>
    </Portal>
  )
}
