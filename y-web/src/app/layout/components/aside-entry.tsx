import { For, Show, children, createMemo } from "solid-js"

import { Link, useLocation } from "@solidjs/router"

import { Icon } from "@/app/components/common/icon/icon"
import { ComponentWithChildren } from "@/module"

const ICON_SIZE_NORMAL = 18
const ICON_SIZE_SMALL = 14

export type AsideEnytryProps = {
  to: string

  icon: string
  title: string

  relatedPaths?: string[]
  subEntry?: boolean
}

export const AsideEntry: ComponentWithChildren<AsideEnytryProps> = (props) => {
  const location = useLocation()

  const subEntries = children(() => props.children).toArray()

  const isActive = createMemo(() => {
    if (location.pathname.includes(props.to)) return true

    for (const path of props.relatedPaths ?? []) {
      if (location.pathname.includes(path)) return true
    }
  })

  const isSelected = createMemo(() => {
    if (location.pathname.endsWith(props.to)) return true
    for (const path of props.relatedPaths ?? []) {
      if (location.pathname.endsWith(path)) return true
    }
  })

  return (
    <>
      <Link
        href={props.to}
        classList={{
          "aside-entry": true,
          selected: isSelected() || isActive(),
          group: subEntries.length > 0,
        }}
      >
        <div class="content">
          <div class="line" />
          <div class="icon">
            <Icon
              size={props.subEntry ? ICON_SIZE_SMALL : ICON_SIZE_NORMAL}
              type="rounded"
              name={props.icon}
            />
          </div>
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
          <div class="spacer" />
          <div class="sub-entries">
            <For each={subEntries}>
              {(entry) => entry && <div class="sub-entry">{entry}</div>}
            </For>
          </div>
        </div>
      </Show>
    </>
  )
}