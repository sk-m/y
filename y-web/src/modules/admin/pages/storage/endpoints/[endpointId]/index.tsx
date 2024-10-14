/* eslint-disable sonarjs/no-duplicate-string */
import { Show, createEffect, createMemo } from "solid-js"

import { useNavigate, useParams } from "@solidjs/router"
import { createMutation, useQueryClient } from "@tanstack/solid-query"

import { Card } from "@/app/components/common/card/card"
import {
  KeyValue,
  KeyValueFields,
} from "@/app/components/common/key-value/key-value"
import { Container } from "@/app/components/common/layout/container"
import { Pill } from "@/app/components/common/pill/pill"
import { SelectField } from "@/app/components/common/select-field/select-field"
import { Stack } from "@/app/components/common/stack/stack"
import { Tab, TabContent, TabsContainer } from "@/app/components/common/tab/tab"
import { Text } from "@/app/components/common/text/text"
import { Toggle } from "@/app/components/common/toggle/toggle"
import { toastCtl } from "@/app/core/toast"
import { genericErrorToast } from "@/app/core/util/toast-utils"
import { Breadcrumb, Breadcrumbs } from "@/app/layout/components/breadcrumbs"
import { routes } from "@/app/routes"
import { unsafe_t } from "@/i18n"
import { updateStorageEndpoint } from "@/modules/admin/storage/storage-endpoint/storage-endpoint.api"
import {
  IStorageEndpointStatus,
  storageEndpointStatus,
} from "@/modules/admin/storage/storage-endpoint/storage-endpoint.codecs"
import {
  adminStorageEndpointsKey,
  useStorageEndpoint,
} from "@/modules/admin/storage/storage-endpoint/storage-endpoint.service"
import { useAuth } from "@/modules/core/auth/auth.service"
import { storageEndpointsKey } from "@/modules/storage/storage-endpoint/storage-endpoint.service"

import { StorageEndpointStatusPill } from "../components/storage-endpoint-status-pill"
import { StorageEndpointTypePill } from "../components/storage-endpoint-type-pill"

const StorageEndpointPage = () => {
  const $auth = useAuth()
  const navigate = useNavigate()
  const params = useParams()
  const queryClient = useQueryClient()
  const { notify } = toastCtl

  const endpointId = createMemo(() => params.endpointId as string)

  const $updateStorageEndpoint = createMutation(updateStorageEndpoint)
  const $storageEndpoint = useStorageEndpoint(() => ({
    endpointId: endpointId(),
  }))

  const endpointsAccessAllowed = createMemo(
    () =>
      $auth.data?.user_rights.some(
        (right) => right.right_name === "manage_storage_endpoints"
      ) ?? false
  )

  createEffect(() => {
    if ($auth.isFetched && !endpointsAccessAllowed()) {
      navigate(routes["/admin/storage"])
    }
  })

  const updateKeyValue = (
    key: string,
    value: string | boolean | null,
    onSuccess?: () => void
  ) => {
    $updateStorageEndpoint.mutate(
      {
        endpointId: Number.parseInt(endpointId()!, 10),
        [key]: value,
      },
      {
        onSuccess: () => {
          void queryClient.invalidateQueries([storageEndpointsKey])
          void queryClient.invalidateQueries([
            adminStorageEndpointsKey,
            { endpointId: endpointId() },
          ])

          onSuccess?.()
        },
        onError: (error) => genericErrorToast(error),
      }
    )
  }

  return (
    <Container size="m">
      <Show when={$storageEndpoint.data}>
        <Breadcrumbs
          style={{
            "margin-bottom": "1em",
          }}
        >
          <Breadcrumb path={routes["/admin"]}>Administration</Breadcrumb>
          <Breadcrumb path={routes["/admin/storage"]}>Storage</Breadcrumb>
          <Breadcrumb path={routes["/admin/storage/endpoints"]}>
            Endpoints
          </Breadcrumb>
          <Breadcrumb
            path={`${routes["/admin/storage/endpoints"]}/${endpointId()}`}
          >
            {$storageEndpoint.data?.name ?? ""}
          </Breadcrumb>
        </Breadcrumbs>

        <Stack spacing={"1.5em"}>
          <Stack spacing={"0.5em"}>
            <Text variant="h2">{$storageEndpoint.data!.name}</Text>
            <Stack direction="row" spacing={"0.5em"}>
              <StorageEndpointStatusPill
                status={$storageEndpoint.data!.status}
              />
              <StorageEndpointTypePill
                type={$storageEndpoint.data!.endpoint_type}
              />
              <Show when={$storageEndpoint.data!.access_rules_enabled}>
                <Pill variant="success">access rules</Pill>
              </Show>
            </Stack>
          </Stack>

          <Stack>
            <TabsContainer>
              <Tab label="General" selected={true} />
            </TabsContainer>

            <TabContent>
              <Stack spacing={"1.5em"}>
                <Card>
                  <Stack direction="row" justifyContent="space-between">
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
                              `main.storage_feature.endpoint_status.${
                                value as string
                              }`
                            ) ??
                            value ??
                            ""
                          ).toLowerCase()
                        }
                        value={$storageEndpoint.data?.status ?? "disabled"}
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
                        value={$storageEndpoint.data?.name ?? ""}
                        onChange={(value) => updateKeyValue("name", value)}
                      />
                      <KeyValue
                        keyWidth="100px"
                        label="Short description"
                        value={$storageEndpoint.data?.description ?? ""}
                        onChange={(value) =>
                          updateKeyValue("description", value)
                        }
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
                        value={$storageEndpoint.data?.base_path ?? ""}
                        onChange={() => void 0}
                      />
                      <KeyValue
                        readonly
                        keyWidth="100px"
                        label="Artifacts path"
                        value={$storageEndpoint.data?.artifacts_path ?? ""}
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
                        <Stack
                          direction="row"
                          spacing={"0.33em"}
                          alignItems="center"
                        >
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
                        value={() =>
                          $storageEndpoint.data?.access_rules_enabled ?? false
                        }
                        onChange={(value) => {
                          updateKeyValue("access_rules_enabled", value, () => {
                            notify({
                              title: value ? "Enabled" : "Disabled",
                              content: "Setting updated successfully.",
                              severity: "success",
                              icon: "check",
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
            </TabContent>
          </Stack>
        </Stack>
      </Show>
    </Container>
  )
}

export default StorageEndpointPage
