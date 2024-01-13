/* eslint-disable no-warning-comments */

/* eslint-disable @typescript-eslint/no-explicit-any */
import { Component, Show } from "solid-js"

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
import { storageEndpointsKey } from "@/modules/admin/storage/storage-endpoint/storage-endpoint.service"

const ENDPOINTS_ROUTE = routes["/admin/storage/endpoints"]

type StorageEndpointFieldValues = {
  name: string
  type: IStorageEndpointType
  preserveFileStructure: boolean
  basePath: string
  description: string
}

const NewStorageEndpointPage: Component = () => {
  const navigate = useNavigate()
  const { notify } = toastCtl
  const queryClient = useQueryClient()

  const $createEndpoint = createMutation(createStorageEndpoint)

  const form = useForm<
    StorageEndpointFieldValues,
    ["type", "preserveFileStructure"]
  >({
    defaultValues: {
      name: "",
      type: "local_fs",
      preserveFileStructure: false,
      basePath: "/var/y_storage",
      description: "",
    },
    watch: ["type", "preserveFileStructure"],
    onSubmit: (values) => {
      $createEndpoint.mutate(values, {
        onSuccess: () => {
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
  const preserveFileStructure = watch("preserveFileStructure")

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
                      <Text fontWeight={450}>Preserve file structure</Text>
                      <Pill variant="warning">not recommended</Pill>
                    </Stack>
                    <Text fontSize={"var(--text-sm)"} variant="secondary">
                      Make the files on the disk reflect the file structure of
                      this endpoint. This can not be changed after the endpoint
                      is created and is less secure than storing everything on a
                      single level, with stripped filenames (which is the
                      default option).
                    </Text>
                  </Stack>

                  <Toggle {...registerControlled("preserveFileStructure")} />
                </Stack>

                <Show when={preserveFileStructure()}>
                  <Note type="warning" fontSize="var(--text-sm)">
                    <p>
                      Preserving the file structure of uploaded files is not
                      recommended, as there is a higher chance for potential
                      security vulnerabilities. Please only use this option if
                      you <i>need</i> your filesystem to reflect the file
                      structure of this endpoint. We do everything to make sure
                      the paths are always validated and sanitized, but it's
                      best to be extra safe and not preserve the file structure
                      in the first place.
                    </p>
                    <p>
                      Please make sure that the user that the server is running
                      under does not have access to anything other than the
                      target directory!
                    </p>
                  </Note>
                </Show>
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
                  margin: "1em 0",
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
                onClick={() => navigate(ENDPOINTS_ROUTE)}
                variant="secondary"
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
