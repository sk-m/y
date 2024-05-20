/* eslint-disable no-undefined */
import { Show } from "solid-js"

import { Link, LinkProps } from "@solidjs/router"

import { Icon } from "@/app/components/common/icon/icon"
import { ComponentWithChildren } from "@/module"

import "./list-entry-link.less"

export type ListEntryLinkProps = LinkProps & {
  arrow?: boolean
}

export const ListEntryLink: ComponentWithChildren<ListEntryLinkProps> = (
  props
) => {
  let ref: HTMLAnchorElement | undefined

  return (
    <div class="ui-list-entry-link">
      <Link {...props} ref={ref}>
        <div class="content">{props.children}</div>
      </Link>
      <Show when={props.arrow}>
        <div class="arrow" onClick={() => ref?.click()}>
          <Icon name="navigate_next" size={14} fill={1} wght={600} />
        </div>
      </Show>
    </div>
  )
}
