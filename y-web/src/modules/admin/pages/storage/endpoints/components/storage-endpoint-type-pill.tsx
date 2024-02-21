import { Component, Match, Switch } from "solid-js"

import { Icon } from "@/app/components/common/icon/icon"
import { Pill } from "@/app/components/common/pill/pill"
import { Stack } from "@/app/components/common/stack/stack"
import { Text } from "@/app/components/common/text/text"
import { IStorageEndpointType } from "@/modules/admin/storage/storage-endpoint/storage-endpoint.codecs"

export type StorageEndpointTypePillProps = {
  type: IStorageEndpointType
}

export const StorageEndpointTypePill: Component<
  StorageEndpointTypePillProps
> = (props) => {
  return (
    <Switch>
      <Match when={props.type === "local_fs"}>
        <Pill
          variant="secondary"
          style={{
            "font-size": "var(--text-sm)",
          }}
        >
          <Stack spacing={"0.5em"} direction="row" alignItems="center">
            <Icon name="hard_drive" size={12} wght={500} />
            <Text>local fs</Text>
          </Stack>
        </Pill>
      </Match>
    </Switch>
  )
}
