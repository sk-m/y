import { For, JSX, Show, children } from "solid-js"

import { Link } from "@solidjs/router"

import { Icon } from "@/app/components/common/icon/icon"
import { ComponentWithChildren } from "@/module"

import "./breadcrumbs.less"

export type BreadcrumbProps = {
  path: string
}

export const Breadcrumb: ComponentWithChildren<BreadcrumbProps> = (props) => {
  return (
    <Link href={props.path} class="ui-breadcrumb">
      <div class="breadcrumb" title={props.path}>
        {props.children}
      </div>
    </Link>
  )
}

export type BreadcrumbsProps = {
  style?: JSX.CSSProperties
}

export const Breadcrumbs: ComponentWithChildren<BreadcrumbsProps> = (props) => {
  const breadcrumbs = children(() => props.children).toArray()

  return (
    <div class="ui-breadcrumbs" style={props.style}>
      <For each={breadcrumbs}>
        {(child, index) => (
          <>
            <Show when={index() !== 0}>
              <div class="spacer">
                <Icon size={12} wght={500} grad={-25} name="chevron_right" />
              </div>
            </Show>
            <div class="ui-breadcrumb">{child}</div>
          </>
        )}
      </For>
    </div>
  )
}
