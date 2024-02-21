import { Component } from "solid-js"

import { Icon } from "@/app/components/common/icon/icon"
import { Stack } from "@/app/components/common/stack/stack"
import { Text } from "@/app/components/common/text/text"

import "./drop-files-here.less"

export type DropFilesHereProps = {
  active: boolean
}

export const DropFilesHere: Component<DropFilesHereProps> = (props) => {
  return (
    <div classList={{ "ui-drop-files-here": true, active: props.active }}>
      <div class="content">
        <Stack alignItems="center" spacing={"1em"}>
          <div class="icon">
            <Icon name="upload" size={32} wght={600} />
          </div>

          <Text
            color="var(--color-primary-d-1)"
            textAlign="center"
            fontSize={"var(--text-body)"}
            fontWeight={600}
          >
            Drop files here to upload
          </Text>
        </Stack>
      </div>
    </div>
  )
}
