import { Show } from "solid-js"
import { Portal } from "solid-js/web"

import { ComponentWithChildren } from "@/module"

import { Icon } from "../common/icon/icon"
import "./context-menu.less"

export const ContextMenuSection: ComponentWithChildren = (props) => {
  return (
    <div class="list-section">
      <div class="section-items">{props.children}</div>
    </div>
  )
}

export type ContextMenuLinkProps = {
  icon?: string
  tip?: string
  onClick?: (event: MouseEvent) => void
}

export const ContextMenuLink: ComponentWithChildren<ContextMenuLinkProps> = (
  props
) => {
  return (
    <button onClick={(event) => props.onClick?.(event)} class="link">
      <div class="left">
        <Show when={props.icon}>
          <div class="icon">
            <Icon name={props.icon!} size={16} wght={500} />
          </div>
        </Show>
        <div class="text">
          <div class="label">{props.children}</div>
        </div>
      </div>
      <div class="right">
        <Show when={props.tip}>
          <div class="tip">{props.tip}</div>
        </Show>
      </div>
    </button>
  )
}

export type ContextMenuProps = {
  position: {
    x: number
    y: number
  } | null

  onClose: () => void
}

export const ContextMenu: ComponentWithChildren<ContextMenuProps> = (props) => {
  return (
    <Portal mount={window.document.body}>
      <Show when={props.position}>
        <div
          onClick={() => props.onClose()}
          onAuxClick={(event) => {
            event.preventDefault()
            props.onClose()
          }}
          onContextMenu={(event) => {
            event.preventDefault()
            props.onClose()
          }}
          class="ui-context-menu-background"
        />
      </Show>
      <div
        class="ui-context-menu"
        style={{
          display: props.position ? "block" : "none",
          ...(props.position
            ? {
                left: `${props.position.x}px`,
                top: `${props.position.y}px`,
              }
            : {}),
        }}
      >
        <div class="menu-list">{props.children}</div>
      </div>
    </Portal>
  )
}
