import { Component, Match, Switch } from "solid-js"

import { Icon } from "@/app/components/common/icon/icon"
import { Text } from "@/app/components/common/text/text"
import { t } from "@/i18n"

import { IUserRightTag } from "../../user-rights/user-rights.codecs"
import "./user-group-right-tag.less"

export type UserGroupRightTagProps = {
  tag: IUserRightTag | "inherited"
}

export const UserGroupRightTag: Component<UserGroupRightTagProps> = (props) => {
  return (
    <div
      classList={{
        "user-group-right-tag": true,
        [props.tag]: true,
      }}
      title={t(`main.userRightTagDescription.${props.tag}`)}
    >
      <Switch>
        <Match when={props.tag === "dangerous"}>
          <Icon name="warning" size={18} wght={500} />
          <Text fontWeight={500}>Dangerous</Text>
        </Match>
        <Match when={props.tag === "administrative"}>
          <Icon name="shield_person" size={18} wght={500} />
          <Text fontWeight={500}>Administrative</Text>
        </Match>
        <Match when={props.tag === "inherited"}>
          <Icon name="switch_access_shortcut" size={18} wght={500} />
        </Match>
      </Switch>
    </div>
  )
}
