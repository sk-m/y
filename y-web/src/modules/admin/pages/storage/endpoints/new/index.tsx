/* eslint-disable no-warning-comments */

/* eslint-disable @typescript-eslint/no-explicit-any */
import { Component } from "solid-js"

import { useNavigate } from "@solidjs/router"
import { createMutation, useQueryClient } from "@tanstack/solid-query"

import { Button } from "@/app/components/common/button/button"
import { Icon } from "@/app/components/common/icon/icon"
import { InputField } from "@/app/components/common/input-field/input-field"
import { Container } from "@/app/components/common/layout/container"
import { Note } from "@/app/components/common/note/note"
import { Pill } from "@/app/components/common/pill/pill"
import { Stack } from "@/app/components/common/stack/stack"
import { Text } from "@/app/components/common/text/text"
import { Toggle } from "@/app/components/common/toggle/toggle"
import { toastCtl } from "@/app/core/toast"
import { useForm } from "@/app/core/use-form"
import { genericErrorToast } from "@/app/core/util/toast-utils"
import { Breadcrumb, Breadcrumbs } from "@/app/layout/components/breadcrumbs"
import { routes } from "@/app/routes"
import { createStorageEndpoint } from "@/modules/admin/storage/storage-endpoint/storage-endpoint.api"
import { IStorageEndpointType } from "@/modules/admin/storage/storage-endpoint/storage-endpoint.codecs"
import { adminStorageEndpointsKey } from "@/modules/admin/storage/storage-endpoint/storage-endpoint.service"
import { storageEndpointsKey } from "@/modules/storage/storage-endpoint/storage-endpoint.service"

const ENDPOINTS_ROUTE = routes["/admin/storage/endpoints"]

type StorageEndpointFieldValues = {
  name: string
  type: IStorageEndpointType
  accessRulesEnabled: boolean
  basePath: string
  artifactsPath: string
  description: string
}

const NewStorageEndpointPage: Component = () => {
  const navigate = useNavigate()
  const { notify } = toastCtl
  const queryClient = useQueryClient()

  const $createEndpoint = createMutation(createStorageEndpoint)

  const form = useForm<
    StorageEndpointFieldValues,
    ["type", "accessRulesEnabled"]
  >({
    defaultValues: {
      name: "",
      type: "local_fs",
      accessRulesEnabled: false,
      basePath: "/var/y_storage",
      artifactsPath: "/var/y_artifacts",
      description: "",
    },
    watch: ["type", "accessRulesEnabled"],
    onSubmit: (values) => {
      if (values.basePath === values.artifactsPath) {
        notify({
          title: "Error",
          content: "Base path and artifacts path cannot be the same",
          severity: "error",
          icon: "error",
        })
        return
      }

      $createEndpoint.mutate(values, {
        onSuccess: () => {
          void queryClient.invalidateQueries([adminStorageEndpointsKey])
          void queryClient.invalidateQueries([storageEndpointsKey])

          notify({
            title: "Endpoint created",
            content: "Storaget endpoint has been created.",
            severity: "success",
            icon: "check",
          })

          navigate(ENDPOINTS_ROUTE)
        },
        onError: (error) => genericErrorToast(error),
      })
    },
  })

  const { register, registerControlled, submit, errors, setValue, watch } = form

  const type = watch("type")

  const updateType = (newType: IStorageEndpointType) =>
    setValue("type", newType)

  return (
    <Container size="xs">
      <Breadcrumbs
        style={{
          "margin-bottom": "1em",
        }}
      >
        <Breadcrumb path={routes["/admin"]}>Administration</Breadcrumb>
        <Breadcrumb path={routes["/admin/storage"]}>Storage</Breadcrumb>
        <Breadcrumb path={ENDPOINTS_ROUTE}>Endpoints</Breadcrumb>
        <Breadcrumb path={routes["/admin/storage/endpoints/new"]}>
          new
        </Breadcrumb>
      </Breadcrumbs>

      <Stack spacing="2em">
        <Stack spacing="0.5em">
          <Text
            variant="h1"
            style={{
              display: "flex",
              "align-items": "center",
              gap: "0.5em",
            }}
          >
            <Icon name="hard_drive" grad={25} wght={500} />
            Create a storage endpoint
          </Text>
        </Stack>

        <form onSubmit={submit}>
          <Stack spacing="2em">
            <Stack spacing={"2em"}>
              <Stack spacing={"1em"}>
                <Text fontWeight={500} variant="secondary">
                  General information
                </Text>

                <InputField
                  label="Endpoint name"
                  error={errors().name}
                  width="100%"
                  maxLength={127}
                  inputProps={{
                    autofocus: true,
                    autocomplete: "name",
                  }}
                  {...register("name", {
                    required: true,
                  })}
                />

                <InputField
                  label="Short description (optional)"
                  error={errors().description}
                  width="100%"
                  maxLength={255}
                  inputProps={{
                    autocomplete: "description",
                  }}
                  {...register("description", {
                    required: false,
                  })}
                />
              </Stack>
              {/* TODO: we have to do this because use-form does not work correctly with unregistered fields.
                        We should either create a separate, custom RadioSet component or add support for
                        unregistered fields to use-form. */}
              <input {...(registerControlled("type") as any)} type="hidden" />
              <Stack spacing={"1em"}>
                <Text fontWeight={500} variant="secondary">
                  Endpoint type
                </Text>
                <fieldset
                  style={{
                    border: "none",
                    display: "flex",
                    padding: 0,
                    margin: 0,
                  }}
                >
                  <Stack spacing={"1em"}>
                    <Stack direction="row" alignItems="center" spacing={"1em"}>
                      <input
                        style={{
                          margin: 0,
                        }}
                        type="radio"
                        name="local_fs"
                        checked={type() === "local_fs"}
                        onChange={() => updateType("local_fs")}
                      />
                      <Stack spacing={"0.15em"}>
                        <Text fontWeight={450}>Local filesystem</Text>
                        <Text
                          variant="secondary"
                          fontWeight={400}
                          fontSize={"var(--text-sm)"}
                        >
                          Store files in a directory on a local filesystem
                        </Text>
                      </Stack>
                    </Stack>
                  </Stack>
                </fieldset>
              </Stack>
              <Stack
                direction="row"
                spacing={"1.5em"}
                alignItems="center"
                justifyContent="flex-start"
              >
                <Icon
                  name="folder_open"
                  wght={500}
                  size={24}
                  fill={1}
                  style={{
                    "margin-left": "0.5em",
                    color: "var(--color-text-grey-05)",
                  }}
                />
                <InputField
                  label="Base path"
                  placeholder="/var/y_storage"
                  error={errors().basePath}
                  width="100%"
                  maxLength={511}
                  inputProps={{
                    autofocus: false,
                    autocomplete: "basePath",
                  }}
                  {...register("basePath", {
                    required: true,
                  })}
                  subtext="Absolute path to the location where the files will be written to."
                />
              </Stack>
              <Stack
                direction="row"
                spacing={"1.5em"}
                alignItems="center"
                justifyContent="flex-start"
              >
                <Icon
                  name="photo_library"
                  wght={500}
                  size={24}
                  fill={1}
                  style={{
                    "margin-left": "0.5em",
                    color: "var(--color-text-grey-05)",
                  }}
                />

                <InputField
                  label="Artifacts path"
                  placeholder="/var/y_artifacts"
                  error={errors().artifactsPath}
                  width="100%"
                  maxLength={511}
                  inputProps={{
                    autofocus: false,
                    autocomplete: "artifactsPath",
                  }}
                  {...register("artifactsPath", {
                    required: true,
                  })}
                  subtext="Absolute path to the location where this endpoint's artifacts (ex. thumbnails) will be stored."
                />
              </Stack>
              <hr
                style={{
                  height: "2px",
                  "background-color": "var(--color-grey-15)",
                }}
              />
              <Stack spacing={"1em"}>
                <Stack
                  direction="row"
                  spacing={"1em"}
                  alignItems="center"
                  justifyContent="space-between"
                >
                  <Stack spacing={"0.25em"}>
                    <Stack
                      direction="row"
                      alignItems="center"
                      spacing={"0.5em"}
                    >
                      <Text fontWeight={450}>Enable access rules</Text>
                      <Pill variant="warning">experimental</Pill>
                    </Stack>
                    <Text fontSize={"var(--text-sm)"} variant="secondary">
                      Access rules allow you to manage access on a per-entry
                      basis, by defining which executors can perform a specific
                      set of actions on a given entry. This gives you
                      fine-grained control over each entry in the endpoint.
                      Turning this feature on will have a slight performance
                      impact, especially on slower hardware. You can toggle this
                      feature any time.
                    </Text>
                  </Stack>

                  <Toggle {...registerControlled("accessRulesEnabled")} />
                </Stack>
              </Stack>
            </Stack>

            <hr
              style={{
                height: "2px",
                "background-color": "var(--color-grey-15)",
              }}
            />

            <Note type="secondary" fontSize="var(--text-sm)">
              To avoid errors and make your server more secure, please make sure
              that the user that the server is running under:
              <ul
                style={{
                  margin: "0.5em 0 0 0",
                  padding: "0 3em",
                }}
              >
                <li>Has access to the target directory.</li>
                <li>
                  <i>Does not have access to the rest of the filesystem.</i>
                </li>
              </ul>
            </Note>

            <Stack direction="row" justifyContent="space-between">
              <Button
                leadingIcon="chevron_left"
                onClick={() => navigate(ENDPOINTS_ROUTE)}
                variant="text"
              >
                Back
              </Button>
              <Button buttonType="submit" disabled={$createEndpoint.isLoading}>
                {$createEndpoint.isLoading ? "Creating..." : "Create"}
              </Button>
            </Stack>
          </Stack>
        </form>
      </Stack>
    </Container>
  )
}

export default NewStorageEndpointPage
