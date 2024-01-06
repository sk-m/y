import { JSX, Show } from "solid-js"
import { Portal } from "solid-js/web"

import { CardProps } from "@/app/components/common/card/card"
import { ComponentWithChildren } from "@/module"

export type ModalProps = {
  header?: JSX.Element

  open: boolean
  onClose: () => void

  keepMounted?: boolean
  style?: CardProps["style"]
}

export const Modal: ComponentWithChildren<ModalProps> = (props) => {
  return (
    <Portal mount={document.getElementById("app-modals-container")!}>
      <div
        classList={{ "ui-modal-container": true, open: props.open }}
        onClick={() => props.onClose()}
      >
        <Show when={props.keepMounted || props.open}>
          <div
            classList={{ "ui-modal": true }}
            onClick={(event) => event.stopPropagation()}
            style={props.style}
          >
            <Show when={props.header}>
              <div class="modal-header">{props.header}</div>
            </Show>
            <div class="modal-content">{props.children}</div>
          </div>
        </Show>
      </div>
    </Portal>
  )
}
