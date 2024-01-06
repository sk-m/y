import { Component, For, Show } from "solid-js"

import { Checkbox } from "@/app/components/common/checkbox/checkbox"
import { Stack } from "@/app/components/common/stack/stack"
import { Text } from "@/app/components/common/text/text"
import { Form } from "@/app/core/use-form"
import { unsafe_t } from "@/i18n"

import {
  UserGroupFieldValues,
  UserGroupWatchedFields,
} from "../../pages/user-groups/[groupId]"
import { IUserRight } from "../../user-rights/user-rights.codecs"
import { UserGroupRightOption } from "./user-group-right-option"
import { UserGroupRightTag } from "./user-group-right-tag"
import "./user-group-right.less"

export type UserGroupRightProps = {
  right: IUserRight
  form: Form<UserGroupFieldValues, UserGroupWatchedFields>

  disabled?: boolean
}

export const UserGroupRight: Component<UserGroupRightProps> = (props) => {
  // eslint-disable-next-line solid/reactivity
  const isAssigned = props.form.watch(
    // eslint-disable-next-line solid/reactivity
    `right:${props.right.name}`
  )

  return (
    <Stack
      style={{
        padding: "1.25em 1.5em",
      }}
      spacing="1.25em"
    >
      <Stack direction="row" justifyContent="space-between">
        <Stack direction="row" alignItems="center" spacing="1em">
          <Checkbox
            disabled={props.disabled}
            checkedLabel="Granted"
            size="l"
            {...props.form.register(`right:${props.right.name}`)}
          />
          <Text fontWeight={500}>
            {unsafe_t(`main.userRight.${props.right.name}.name`)}
          </Text>
        </Stack>
        <Stack direction="row" spacing="0.75em">
          <For each={props.right.tags}>
            {(tag) => <UserGroupRightTag tag={tag} />}
          </For>
        </Stack>
      </Stack>
      <Text
        style={{
          "font-size": "var(--text-sm)",
          color: "var(--color-text-grey-05)",
        }}
      >
        {unsafe_t(`main.userRight.${props.right.name}.description`)}
      </Text>
      <Show when={props.right.options.length > 0}>
        <Stack
          direction="row"
          spacing="1em"
          alignItems="stretch"
          style={{
            display: isAssigned() ? "flex" : "none",
          }}
        >
          <div class="user-group-right-options-section-left-floater" />
          <Stack spacing="1em">
            <Text
              fontWeight={450}
              container="pill"
              color="var(--color-text-grey-05)"
              fontSize="var(--text-sm)"
            >
              Right options
            </Text>
            <For each={props.right.options}>
              {(option) => (
                <UserGroupRightOption
                  right={props.right}
                  option={option}
                  form={props.form}
                  disabled={props.disabled}
                />
              )}
            </For>
          </Stack>
        </Stack>
      </Show>
    </Stack>
  )
}
