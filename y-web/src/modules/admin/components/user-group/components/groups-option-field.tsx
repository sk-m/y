import { Component, createMemo } from "solid-js"

import { SelectField } from "@/app/components/common/select-field/select-field"
import { Form } from "@/app/core/use-form"
import { unsafe_t } from "@/i18n"
import {
  UserGroupFieldValues,
  UserGroupWatchedFields,
} from "@/modules/admin/pages/user-groups/[groupId]/rights"
import { useUserGroups } from "@/modules/admin/user-groups/user-groups.service"
import {
  IUserRight,
  IUserRightOption,
} from "@/modules/admin/user-rights/user-rights.codecs"

export type GroupsOptionFieldProps = {
  right: IUserRight
  option: IUserRightOption
  form: Form<UserGroupFieldValues, UserGroupWatchedFields>

  disabled?: boolean
}

export const UserGroupSelectField: Component<GroupsOptionFieldProps> = (
  props
) => {
  const $userGroups = useUserGroups(() => ({}))

  const options = createMemo(() => $userGroups.data?.user_groups ?? [])

  // !TODO registerControlled's output is typed as any for now.
  return (
    <SelectField
      multi
      disabled={props.disabled}
      label={unsafe_t(
        `main.userRightOption.${props.right.name}.${props.option.name}.label`
      )}
      subtext={unsafe_t(
        `main.userRightOption.${props.right.name}.${props.option.name}.description`
      )}
      width="400px"
      options={options()}
      {...(props.form.registerControlled(
        `right_option:${props.right.name}:${props.option.name}`
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ) as any)}
    />
  )
}
