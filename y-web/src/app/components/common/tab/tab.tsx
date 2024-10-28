import { Component, JSX } from "solid-js"

import { ComponentWithChildren } from "@/module"

import "./tab.less"

export type TabProps = {
  label: JSX.Element
  selected?: boolean

  onClick?: (event: MouseEvent) => void
}

export const TabsContainer: ComponentWithChildren = (props) => {
  return <div class="ui-tabs-container">{props.children}</div>
}

export const TabContent: ComponentWithChildren = (props) => {
  return <div class="ui-tab-content">{props.children}</div>
}

export const Tab: Component<TabProps> = (props) => {
  return (
    <button
      classList={{ "ui-tab": true, selected: props.selected ?? false }}
      onClick={(event) => props.onClick?.(event)}
    >
      <div class="label">{props.label}</div>
    </button>
  )
}
