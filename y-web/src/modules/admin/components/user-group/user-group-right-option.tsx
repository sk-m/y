import { Component, Match, Switch } from "solid-js"

import { Checkbox } from "@/app/components/common/checkbox/checkbox"
import { InputField } from "@/app/components/common/input-field/input-field"
import { Stack } from "@/app/components/common/stack/stack"
import { Text } from "@/app/components/common/text/text"
import { Form } from "@/app/core/use-form"
import { unsafe_t } from "@/i18n"

import {
  UserGroupFieldValues,
  UserGroupWatchedFields,
} from "../../pages/user-groups/[groupId]"
import {
  IUserRight,
  IUserRightOption,
} from "../../user-rights/user-rights.codecs"

export type UserGroupRightOptionProps = {
  right: IUserRight
  option: IUserRightOption
  form: Form<UserGroupFieldValues, UserGroupWatchedFields>
}

export const UserGroupRightOption: Component<UserGroupRightOptionProps> = (
  props
) => {
  return (
    <Switch>
      <Match when={props.option.value_type === "boolean"}>
        <Stack direction="row" spacing="0.75em" alignItems="center">
          <Checkbox
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
        <Stack spacing="0.5em">
          <InputField
            label={unsafe_t(
              `main.userRightOption.${props.right.name}.${props.option.name}.label`
            )}
            subtext={unsafe_t(
              `main.userRightOption.${props.right.name}.${props.option.name}.description`
            )}
            width="400px"
            {...props.form.register(
              `right_option:${props.right.name}:${props.option.name}`
            )}
          />
        </Stack>
      </Match>
    </Switch>
  )
}
