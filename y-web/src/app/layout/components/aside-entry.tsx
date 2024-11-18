import { For, JSX, Show, children, createMemo } from "solid-js"

import { Link, useLocation } from "@solidjs/router"

import { Icon } from "@/app/components/common/icon/icon"
import { ComponentWithChildren } from "@/module"

const ICON_SIZE_NORMAL = 18
const ICON_SIZE_SMALL = 14

export type AsideEnytryProps = {
  to: string

  icon?: string
  title: string

  relatedPaths?: string[]
  exact?: boolean
  subEntry?: boolean
  small?: boolean

  linkProps?: JSX.HTMLAttributes<HTMLAnchorElement>
}

export const AsideEntry: ComponentWithChildren<AsideEnytryProps> = (props) => {
  const location = useLocation()

  const subEntries = createMemo(() => children(() => props.children).toArray())

  const isActive = createMemo(() => {
    if (props.exact) {
      const target = `${location.pathname}${location.search}`

      if (target === props.to) return true

      for (const path of props.relatedPaths ?? []) {
        if (target === path) return true
      }
    } else {
      const target = location.pathname

      if (target.startsWith(props.to)) return true

      for (const path of props.relatedPaths ?? []) {
        if (target.startsWith(path)) return true
      }
    }
  })

  return (
    <>
      <Link
        href={props.to}
        classList={{
          "aside-entry": true,
          small: props.small,
          selected: isActive(),
          group: subEntries().length > 0,
        }}
        {...props.linkProps}
      >
        <div class="content">
          {/* <div class="line" /> */}
          <Show when={props.icon}>
            <div class="icon">
              <Icon
                size={props.subEntry ? ICON_SIZE_SMALL : ICON_SIZE_NORMAL}
                wght={450}
                type="rounded"
                name={props.icon!}
              />
            </div>
          </Show>
          <div class="text">{props.title}</div>
        </div>
        <div class="arrow">
          <Icon
            size={props.subEntry ? ICON_SIZE_SMALL : ICON_SIZE_NORMAL}
            wght={500}
            name={props.children ? "expand_more" : "chevron_right"}
          />
        </div>
      </Link>
      <Show when={props.children && isActive()}>
        <div class="sub-entries-container">
          {/* <div class="spacer" /> */}
          <div class="sub-entries">
            <For each={subEntries()}>
              {(entry) => entry && <div class="sub-entry">{entry}</div>}
            </For>
          </div>
        </div>
      </Show>
    </>
  )
}
