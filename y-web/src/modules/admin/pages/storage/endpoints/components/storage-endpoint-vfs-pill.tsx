/* eslint-disable sonarjs/no-duplicate-string */
import { Component } from "solid-js"

import { Icon } from "@/app/components/common/icon/icon"
import { Pill } from "@/app/components/common/pill/pill"
import { Stack } from "@/app/components/common/stack/stack"

export const StorageEndpointVFSPill: Component = () => {
  return (
    <Pill
      variant="purple"
      style={{
        "font-size": "var(--text-sm)",
      }}
    >
      <Stack spacing={"0.5em"} direction="row" alignItems="center">
        <Icon name="folder_data" size={12} wght={500} />
        VFS
      </Stack>
    </Pill>
  )
}
