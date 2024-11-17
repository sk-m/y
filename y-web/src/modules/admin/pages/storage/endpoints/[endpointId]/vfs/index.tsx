import { Component, createEffect } from "solid-js"
import { createStore } from "solid-js/store"

import { createMutation, useQueryClient } from "@tanstack/solid-query"

import { Button } from "@/app/components/common/button/button"
import { Card } from "@/app/components/common/card/card"
import {
  KeyValue,
  KeyValueFields,
} from "@/app/components/common/key-value/key-value"
import { Note } from "@/app/components/common/note/note"
import { Pill } from "@/app/components/common/pill/pill"
import { SelectField } from "@/app/components/common/select-field/select-field"
import { Stack } from "@/app/components/common/stack/stack"
import { Text } from "@/app/components/common/text/text"
import { Toggle } from "@/app/components/common/toggle/toggle"
import { toastCtl } from "@/app/core/toast"
import { genericErrorToast } from "@/app/core/util/toast-utils"
import { setStorageEndpointVFSConfig } from "@/modules/admin/storage/storage-endpoint/storage-endpoint.api"
import { IStorageEndpointVFSConfig } from "@/modules/admin/storage/storage-endpoint/storage-endpoint.codecs"
import {
  adminStorageEndpointsVFSConfigKey,
  useStorageEndpointVFSConfig,
} from "@/modules/admin/storage/storage-endpoint/storage-endpoint.service"
import { IStorageEndpoint } from "@/modules/storage/storage-endpoint/storage-endpoint.codecs"

export type StorageEndpointVFSSubpageProps = {
  endpoint: IStorageEndpoint
}

const StorageEndpointVFSSubpage: Component<StorageEndpointVFSSubpageProps> = (
  props
) => {
  const queryClient = useQueryClient()
  const { notify } = toastCtl

  const [config, setConfig] = createStore<IStorageEndpointVFSConfig>({
    enabled: false,
    writable: false,
    mountpoint: "",
  })

  const $endpointVfsConfig = useStorageEndpointVFSConfig(() => ({
    endpointId: props.endpoint.id,
  }))

  const $setEndpointVFSConfig = createMutation(setStorageEndpointVFSConfig)

  const saveConfig = () => {
    $setEndpointVFSConfig.mutate(
      {
        endpointId: props.endpoint.id,
        ...config,
      },
      {
        onSuccess: () => {
          notify({
            title: "VFS configuration saved",
            severity: "success",
            icon: "check",
          })

          void queryClient.invalidateQueries([
            adminStorageEndpointsVFSConfigKey,
            { endpointId: props.endpoint.id },
          ])
        },

        onError: (error) => genericErrorToast(error),
      }
    )
  }

  createEffect(() => {
    if ($endpointVfsConfig.data?.vfs_config) {
      setConfig($endpointVfsConfig.data.vfs_config)
    }
  })

  return (
    <Stack spacing={"1.5em"}>
      <Card>
        <Stack spacing={"1.5em"}>
          <div class="ui-card-label">
            <div class="label-strip" />
            <Stack spacing={"0.33"}>
              <Stack direction="row" spacing={"0.33em"} alignItems="center">
                <Text
                  variant="h3"
                  style={{
                    margin: "0",
                  }}
                >
                  Virtual File System Configuration
                </Text>
                <Pill variant="warning">experimental</Pill>
              </Stack>
              <Text variant="secondary" fontSize={"var(--text-sm)"}>
                Configure how this endpoint will be mounted.
              </Text>
            </Stack>
          </div>
          <Stack
            spacing={"1em"}
            style={{
              width: "25rem",
            }}
          >
            <Stack
              direction="row"
              spacing={"1em"}
              alignItems="center"
              justifyContent="space-between"
              style={{
                "box-sizing": "border-box",
                padding: "0.5em 1em",
                "border-radius": "8px",
                background: "var(--color-grey-1)",
              }}
            >
              <Text fontWeight={500}>Enable VFS</Text>
              <Toggle
                value={() => config.enabled}
                onChange={(value) => {
                  setConfig("enabled", value)
                }}
                size="m"
              />
            </Stack>
            <KeyValueFields textAlign="left">
              <KeyValue<"rw" | "ro">
                keyWidth="50%"
                label="Type"
                value={config.writable ? "rw" : "ro"}
                onChange={(value) => {
                  setConfig("writable", value === "rw")
                }}
                getValueString={(value) => {
                  switch (value) {
                    case "ro": {
                      return "Readonly"
                    }
                    case "rw": {
                      return "Read-write"
                    }
                    default: {
                      return ""
                    }
                  }
                }}
                inputField={(inputProps) => (
                  <SelectField<false, { name: string; id: "rw" | "ro" }>
                    multi={false}
                    options={[
                      { name: "Readonly", id: "ro" },
                      { name: "Read & write", id: "rw" },
                    ]}
                    width="100%"
                    hideCheckboxes
                    {...inputProps}
                  />
                )}
              />
              <KeyValue
                keyWidth="50%"
                label="Mountpoint"
                value={config.mountpoint}
                onChange={(value) => {
                  setConfig("mountpoint", value)
                }}
              />
            </KeyValueFields>
            <Note type="secondary" fontSize="var(--text-sm)">
              Make sure the y-server user has the necessary permissions to
              access the mountpoint.
            </Note>
            <Stack spacing={"1em"} direction="row" alignItems="center">
              <Button onClick={saveConfig}>Save</Button>
            </Stack>
          </Stack>
        </Stack>
      </Card>
    </Stack>
  )
}

export default StorageEndpointVFSSubpage
