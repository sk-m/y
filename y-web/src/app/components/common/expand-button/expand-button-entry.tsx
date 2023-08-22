/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { Show } from "solid-js"

import { Icon } from "@/app/components/common/icon/icon"
import { ComponentWithChildren } from "@/module"

export const ExpandButtonEntries: ComponentWithChildren = (props) => {
  return <div class="ui-expand-button-entries">{props.children}</div>
}

export type ExpandButtonEntryProps = {
  icon?: string

  variant?: "default" | "danger"

  onClick?: () => void
}

export const ExpandButtonEntry: ComponentWithChildren<
  ExpandButtonEntryProps
> = (props) => {
  return (
    <button
      onClick={() => props.onClick?.()}
      classList={{
        "ui-expand-button-entry": true,
        [props.variant ?? "default"]: true,
      }}
    >
      <Show when={props.icon}>
        <Icon size={16} grad={0} name={props.icon!} />
      </Show>
      <Show when={props.children}>
        <div class="label">{props.children!}</div>
      </Show>
    </button>
  )
}
