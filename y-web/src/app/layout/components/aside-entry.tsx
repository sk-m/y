import { For, Show, children, createMemo } from "solid-js"

import { Link, useLocation } from "@solidjs/router"

import { Icon } from "@/app/components/common/icon/icon"
import { ComponentWithChildren } from "@/module"

export type AsideEnytryProps = {
  to: string

  icon: string
  title: string
}

export const AsideEntry: ComponentWithChildren<AsideEnytryProps> = (props) => {
  const location = useLocation()

  const subEntries = children(() => props.children).toArray()

  const isActive = createMemo(() => location.pathname.includes(props.to))
  const isSelected = createMemo(() => location.pathname.endsWith(props.to))

  return (
    <>
      <Link
        href={props.to}
        classList={{
          "aside-entry": true,
          selected: isSelected(),
          group: subEntries.length > 0,
        }}
      >
        <div class="content">
          <div class="icon">
            <Icon size={18} fill={0} type="outlined" name={props.icon} />
          </div>
          <div class="text">{props.title}</div>
        </div>
        <div class="arrow">
          <Icon
            size={18}
            name={props.children ? "expand_more" : "chevron_right"}
          />
        </div>
      </Link>
      <Show when={props.children && isActive()}>
        <div class="sub-entries">
          <For each={subEntries}>
            {(entry) =>
              entry && (
                <div class="sub-entry">
                  <div class="separator" />
                  {entry}
                </div>
              )
            }
          </For>
        </div>
      </Show>
    </>
  )
}
