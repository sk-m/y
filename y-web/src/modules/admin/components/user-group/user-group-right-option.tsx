import { Component, Match, Switch } from "solid-js"

import { Checkbox } from "@/app/components/common/checkbox/checkbox"
import { Stack } from "@/app/components/common/stack/stack"
import { Text } from "@/app/components/common/text/text"
import { Form } from "@/app/core/use-form"
import { unsafe_t } from "@/i18n"

import {
  UserGroupFieldValues,
  UserGroupWatchedFields,
} from "../../pages/user-groups/[groupId]/rights"
import {
  IUserRight,
  IUserRightOption,
} from "../../user-rights/user-rights.codecs"
import { UserGroupSelectField } from "./components/groups-option-field"
import { StorageEndpointSelectField } from "./components/storage-endpoints-option-field"

export type UserGroupRightOptionProps = {
  right: IUserRight
  option: IUserRightOption
  form: Form<UserGroupFieldValues, UserGroupWatchedFields>

  disabled?: boolean
}

export const UserGroupRightOption: Component<UserGroupRightOptionProps> = (
  props
) => {
  return (
    <Switch>
      <Match when={props.option.value_type === "boolean"}>
        <Stack direction="row" spacing="0.75em" alignItems="center">
          <Checkbox
            disabled={props.disabled}
            checkedLabel="Allow"
            {...props.form.register(
              `right_option:${props.right.name}:${props.option.name}`
            )}
          />
          <Text>
            {unsafe_t(
              `main.userRightOption.${props.right.name}.${props.option.name}.description`
            )}
          </Text>
        </Stack>
      </Match>
      <Match when={props.option.value_type === "string_array"}>
        <Switch>
          <Match when={props.option.value_source === "user_groups"}>
            <UserGroupSelectField {...props} />
          </Match>
          <Match when={props.option.value_source === "storage_endpoints"}>
            <StorageEndpointSelectField {...props} />
          </Match>
        </Switch>
      </Match>
    </Switch>
  )
}
