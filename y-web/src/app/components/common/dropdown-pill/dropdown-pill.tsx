import { JSX, Show } from "solid-js"

import { ComponentWithChildren } from "@/module"

import "./dropdown-pill.less"

export type DropdownPillProps = {
  content: JSX.Element

  expanded?: boolean
  onExpand: (expanded: boolean) => void

  icon?: JSX.Element
}

export const DropdownPill: ComponentWithChildren<DropdownPillProps> = (
  props
) => {
  return (
    <div
      classList={{
        "ui-dropdown-pill-container": true,
        expanded: props.expanded,
      }}
    >
      <button
        class="dropdown-pill"
        onClick={() => props.onExpand(!props.expanded)}
      >
        {/* <div class="spacer-dot" /> */}
        <Show when={props.icon}>
          <div class="icon">{props.icon}</div>
        </Show>
        <div class="label">{props.children}</div>
      </button>
      <div class="dropdown-content">{props.content}</div>
    </div>
  )
}
