import { Component } from "solid-js"

import { Icon } from "@/app/components/common/icon/icon"

import "./input-error.less"

export type InputErrorProps = {
  error?: string
}

export const InputError: Component<InputErrorProps> = (props) => {
  return (
    <div class="ui-input-error">
      <div class="icon">
        <Icon name="error" wght={400} size={16} />
      </div>
      <div class="text">{props.error}</div>
    </div>
  )
}
