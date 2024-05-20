import { ComponentWithChildren } from "@/module"

import "./list-entry-title-leader.less"

export const ListEntryTitleLeader: ComponentWithChildren = (props) => {
  return <div class="ui-list-entry-title-leader">{props.children}</div>
}
