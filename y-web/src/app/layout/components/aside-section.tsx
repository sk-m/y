import { Show } from "solid-js"

import { ComponentWithChildren } from "@/module"

export type AsideSectionProps = {
  title?: string
}

export const AsideSection: ComponentWithChildren<AsideSectionProps> = (
  props
) => {
  return (
    <div class="aside-section">
      <Show when={props.title}>
        <div class="aside-section-title">{props.title}</div>
      </Show>
      <div class="aside-section-content">{props.children}</div>
    </div>
  )
}
