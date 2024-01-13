import { Show, createEffect, createMemo } from "solid-js"

import { useNavigate, useParams } from "@solidjs/router"
import { createMutation, useQueryClient } from "@tanstack/solid-query"

import {
  KeyValue,
  KeyValueFields,
} from "@/app/components/common/key-value/key-value"
import { Container } from "@/app/components/common/layout/container"
import { Stack } from "@/app/components/common/stack/stack"
import { Text } from "@/app/components/common/text/text"
import { genericErrorToast } from "@/app/core/util/toast-utils"
import { Breadcrumb, Breadcrumbs } from "@/app/layout/components/breadcrumbs"
import { routes } from "@/app/routes"
import { updateStorageEndpoint } from "@/modules/admin/storage/storage-endpoint/storage-endpoint.api"
import {
  storageEndpointsKey,
  useStorageEndpoint,
} from "@/modules/admin/storage/storage-endpoint/storage-endpoint.service"
import { useAuth } from "@/modules/core/auth/auth.service"

import { StorageEndpointStatusPill } from "../components/storage-endpoint-status-pill"
import { StorageEndpointTypePill } from "../components/storage-endpoint-type-pill"

const StorageEndpointPage = () => {
  const $auth = useAuth()
  const navigate = useNavigate()
  const params = useParams()
  const queryClient = useQueryClient()

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

  const updateKeyValue = (key: string, value: string) => {
    $updateStorageEndpoint.mutate(
      {
        endpointId: Number.parseInt(endpointId()!, 10),
        [key]: value,
      },
      {
        onSuccess: () => {
          void queryClient.invalidateQueries([
            storageEndpointsKey,
            { endpointId: endpointId() },
          ])
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

        <Stack spacing={"2em"}>
          <Stack spacing={"0.5em"}>
            <Text variant="h2">{$storageEndpoint.data!.name}</Text>
            <Stack direction="row" spacing={"0.5em"}>
              <StorageEndpointStatusPill
                status={$storageEndpoint.data!.status}
              />
              <StorageEndpointTypePill
                type={$storageEndpoint.data!.endpoint_type}
              />
            </Stack>
          </Stack>

          <Stack spacing={"1em"}>
            <Text variant="secondary" fontWeight={500}>
              General information
            </Text>
            <KeyValueFields
              style={{
                width: "500px",
              }}
            >
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
                onChange={(value) => updateKeyValue("description", value)}
              />
              <KeyValue
                readonly
                keyWidth="100px"
                label="Base path"
                value={$storageEndpoint.data?.base_path ?? ""}
                onChange={() => void 0}
              />
            </KeyValueFields>
          </Stack>
        </Stack>
      </Show>
    </Container>
  )
}

export default StorageEndpointPage
