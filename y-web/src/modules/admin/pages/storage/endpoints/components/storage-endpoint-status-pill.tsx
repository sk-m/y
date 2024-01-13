/* eslint-disable sonarjs/no-duplicate-string */
import { Component, Match, Switch } from "solid-js"

import { Pill } from "@/app/components/common/pill/pill"
import { IStorageEndpointStatus } from "@/modules/admin/storage/storage-endpoint/storage-endpoint.codecs"

export type StorageEndpointStatusPillProps = {
  status: IStorageEndpointStatus
}

export const StorageEndpointStatusPill: Component<
  StorageEndpointStatusPillProps
> = (props) => {
  return (
    <Switch>
      <Match when={props.status === "read_only"}>
        <Pill
          dot
          variant="secondary"
          style={{
            "font-size": "var(--text-sm)",
          }}
        >
          read-only
        </Pill>
      </Match>
      <Match when={props.status === "disabled"}>
        <Pill
          dot
          variant="warning"
          style={{
            "font-size": "var(--text-sm)",
          }}
        >
          disabled
        </Pill>
      </Match>
      <Match when={props.status === "active"}>
        <Pill
          dot
          variant="success"
          style={{
            "font-size": "var(--text-sm)",
          }}
        >
          active
        </Pill>
      </Match>
    </Switch>
  )
}
