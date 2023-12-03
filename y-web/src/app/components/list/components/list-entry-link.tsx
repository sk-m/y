import { Link, LinkProps } from "@solidjs/router"

import { Icon } from "@/app/components/common/icon/icon"
import { ComponentWithChildren } from "@/module"

import "./list-entry-link.less"

export type ListEntryLinkProps = LinkProps

export const ListEntryLink: ComponentWithChildren<ListEntryLinkProps> = (
  props
) => {
  return (
    <div class="ui-list-entry-link">
      <Link {...props}>
        <div class="content">{props.children}</div>
      </Link>
      <div class="arrow">
        <Icon name="navigate_next" size={14} fill={1} wght={600} />
      </div>
    </div>
  )
}
