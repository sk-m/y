/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { JSXElement, Show, createSignal } from "solid-js"

import { Icon } from "@/app/components/common/icon/icon"
import { ComponentWithChildren } from "@/module"

import "./expand-button.less"

export type ExpandButtonProps = {
  label?: JSXElement
  icon?: string
  variant?: "filled" | "text"
  position?: "left" | "right"
}

export const ExpandButton: ComponentWithChildren<ExpandButtonProps> = (
  props
) => {
  const [expanded, setExpanded] = createSignal(false)

  const toggleExpanded = () => setExpanded((value) => !value)

  return (
    <div
      classList={{
        "ui-expand-button": true,
        expanded: expanded(),
      }}
    >
      <button
        type="button"
        classList={{
          button: true,
          "no-label": !props.label,
          [props.variant ?? "filled"]: true,
        }}
        onClick={toggleExpanded}
      >
        <Show when={props.icon}>
          <Icon
            size={16}
            fill={1}
            type="rounded"
            name={expanded() ? "expand_less" : props.icon!}
          />
        </Show>
        <Show when={props.label}>
          <div class="label">{props.label}</div>
        </Show>
      </button>
      <div
        classList={{ "expand-panel": true, [props.position ?? "left"]: true }}
      >
        {props.children}
      </div>
    </div>
  )
}
