/* eslint-disable sonarjs/no-duplicate-string */
import { Component } from "solid-js"

import { createMutation, useQueryClient } from "@tanstack/solid-query"

import { Card } from "@/app/components/common/card/card"
import {
  KeyValue,
  KeyValueFields,
} from "@/app/components/common/key-value/key-value"
import { Pill } from "@/app/components/common/pill/pill"
import { SelectField } from "@/app/components/common/select-field/select-field"
import { Stack } from "@/app/components/common/stack/stack"
import { Text } from "@/app/components/common/text/text"
import { Toggle } from "@/app/components/common/toggle/toggle"
import { toastCtl } from "@/app/core/toast"
import { genericErrorToast } from "@/app/core/util/toast-utils"
import { unsafe_t } from "@/i18n"
import { updateStorageEndpoint } from "@/modules/admin/storage/storage-endpoint/storage-endpoint.api"
import {
  IStorageEndpoint,
  IStorageEndpointStatus,
  storageEndpointStatus,
} from "@/modules/admin/storage/storage-endpoint/storage-endpoint.codecs"
import { adminStorageEndpointsKey } from "@/modules/admin/storage/storage-endpoint/storage-endpoint.service"
import { storageEndpointsKey } from "@/modules/storage/storage-endpoint/storage-endpoint.service"

export type StorageEndpointGeneralSubpageProps = {
  endpoint: IStorageEndpoint
}

const StorageEndpointGeneralSubpage: Component<
  StorageEndpointGeneralSubpageProps
> = (props) => {
  const { notify } = toastCtl
  const queryClient = useQueryClient()

  const $updateStorageEndpoint = createMutation(updateStorageEndpoint)

  const updateKeyValue = (
    key: string,
    value: string | boolean | null,
    onSuccess?: () => void
  ) => {
    $updateStorageEndpoint.mutate(
      {
        endpointId: props.endpoint.id,
        [key]: value,
      },
      {
        onSuccess: () => {
          void queryClient.invalidateQueries([storageEndpointsKey])
          void queryClient.invalidateQueries([adminStorageEndpointsKey])
          void queryClient.invalidateQueries([
            adminStorageEndpointsKey,
            { endpointId: props.endpoint.id },
          ])

          onSuccess?.()
        },
        onError: (error) => genericErrorToast(error),
      }
    )
  }

  return (
    <Stack spacing={"1.5em"}>
      <Card>
        <Stack spacing={"1.5em"}>
          <div class="ui-card-label">
            <div class="label-strip" />
            <Text
              variant="h3"
              style={{
                margin: "0",
              }}
            >
              General configuration
            </Text>
          </div>

          <KeyValueFields
            textAlign="left"
            style={{
              width: "50%",
            }}
          >
            <KeyValue<IStorageEndpointStatus>
              keyWidth="100px"
              label="Status"
              getValueString={(value) =>
                (
                  unsafe_t(
                    `main.storage_feature.endpoint_status.${value as string}`
                  ) ??
                  value ??
                  ""
                ).toLowerCase()
              }
              value={props.endpoint.status}
              onChange={(value) => updateKeyValue("status", value)}
              inputField={(inputProps) => (
                <SelectField<
                  false,
                  { name: string; id: IStorageEndpointStatus }
                >
                  multi={false}
                  options={storageEndpointStatus.map((status) => ({
                    name:
                      unsafe_t(
                        `main.storage_feature.endpoint_status.${status}`
                      ) ?? status,
                    id: status,
                  }))}
                  width="100%"
                  hideCheckboxes
                  {...inputProps}
                />
              )}
            />
            <KeyValue
              keyWidth="100px"
              label="Name"
              value={props.endpoint.name}
              onChange={(value) => updateKeyValue("name", value)}
            />
            <KeyValue
              keyWidth="100px"
              label="Short description"
              value={props.endpoint.description}
              onChange={(value) => updateKeyValue("description", value)}
            />
          </KeyValueFields>
        </Stack>
      </Card>

      <Card>
        <Stack direction="row" justifyContent="space-between">
          <div class="ui-card-label">
            <div class="label-strip" />
            <Stack spacing={"0.33"}>
              <Text
                variant="h3"
                style={{
                  margin: "0",
                }}
              >
                Filesystem paths
              </Text>
              <Text variant="secondary" fontSize={"var(--text-sm)"}>
                Endpoint's paths can not be updated after creation.
              </Text>
            </Stack>
          </div>

          <KeyValueFields
            style={{
              width: "50%",
            }}
          >
            <KeyValue
              readonly
              keyWidth="100px"
              label="Base path"
              value={props.endpoint.base_path}
              onChange={() => void 0}
            />
            <KeyValue
              readonly
              keyWidth="100px"
              label="Artifacts path"
              value={props.endpoint.artifacts_path ?? ""}
              onChange={() => void 0}
            />
          </KeyValueFields>
        </Stack>
      </Card>

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
                  Access rules
                </Text>
                <Pill variant="warning">experimental</Pill>
              </Stack>
              <Text variant="secondary" fontSize={"var(--text-sm)"}>
                Manage storage permissions on a per-entry basis.
              </Text>
            </Stack>
          </div>
          <Stack direction="row" spacing={"1em"} alignItems="center">
            <Toggle
              value={() => props.endpoint.access_rules_enabled}
              onChange={(value) => {
                updateKeyValue("access_rules_enabled", value, () => {
                  notify({
                    title: value ? "Enabled" : "Disabled",
                    content: "Setting updated successfully.",
                    severity: "success",
                    icon: value ? "toggle_on" : "toggle_off",
                  })
                })
              }}
              size="m"
            />
            <Text variant="secondary" fontSize={"var(--text-sm)"}>
              Enforce storage access rules for this endpoint.
            </Text>
          </Stack>
        </Stack>
      </Card>
    </Stack>
  )
}

export default StorageEndpointGeneralSubpage
