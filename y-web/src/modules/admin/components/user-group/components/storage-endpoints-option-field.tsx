import { Component, createMemo } from "solid-js"

import { SelectField } from "@/app/components/common/select-field/select-field"
import { Form } from "@/app/core/use-form"
import { unsafe_t } from "@/i18n"
import {
  UserGroupFieldValues,
  UserGroupWatchedFields,
} from "@/modules/admin/pages/user-groups/[groupId]/rights"
import {
  IUserRight,
  IUserRightOption,
} from "@/modules/admin/user-rights/user-rights.codecs"
import { useStorageEndpoints } from "@/modules/storage/storage-endpoint/storage-endpoint.service"

export type StorageEndpointsOptionFieldProps = {
  right: IUserRight
  option: IUserRightOption
  form: Form<UserGroupFieldValues, UserGroupWatchedFields>

  disabled?: boolean
}

export const StorageEndpointSelectField: Component<
  StorageEndpointsOptionFieldProps
> = (props) => {
  const $storageEndpoints = useStorageEndpoints()

  const options = createMemo(() => $storageEndpoints.data?.endpoints ?? [])

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
