/* eslint-disable @typescript-eslint/no-explicit-any */

/* eslint-disable sonarjs/no-duplicate-string */
import { Component, Show, createEffect, createMemo, on } from "solid-js"

import { createMutation, useQueryClient } from "@tanstack/solid-query"
import { format } from "date-fns"

import { Button } from "@/app/components/common/button/button"
import { Card } from "@/app/components/common/card/card"
import { InputField } from "@/app/components/common/input-field/input-field"
import { Container } from "@/app/components/common/layout/container"
import { Stack } from "@/app/components/common/stack/stack"
import { Text } from "@/app/components/common/text/text"
import { toastCtl } from "@/app/core/toast"
import { useForm } from "@/app/core/use-form"
import { Breadcrumb, Breadcrumbs } from "@/app/layout/components/breadcrumbs"
import { routes } from "@/app/routes"
import { updateConfigOption } from "@/modules/admin/config/admin-config.api"
import { IAdminConfigOption } from "@/modules/admin/config/admin-config.codecs"
import {
  adminConfigOptionsKey,
  useAdminConfigOptions,
} from "@/modules/admin/config/admin-config.service"
import { instanceConfigKey } from "@/modules/core/instance-config/instance-config.service"

import "../config-page.less"

type OptionUpdatedTextProps = {
  option?: IAdminConfigOption
}

const OptionUpdatedText: Component<OptionUpdatedTextProps> = (props) => {
  return (
    <Show when={props.option?.updated_at}>
      <Text variant="secondary" fontSize={"var(--text-sm)"} italic>
        Last updated by {props.option!.updated_by_username ?? "-"} on{" "}
        {format(new Date(props.option!.updated_at!), "dd.MM.yyyy HH:mm")}
      </Text>
    </Show>
  )
}

const ConfigGeneralPage = () => {
  const queryClient = useQueryClient()
  const { notify } = toastCtl

  // TODO update useForm to correctly handle the types in this particular case.
  // We should not hack with `as any` all the time
  const { setValue, getValue, register, watch } = useForm<
    Record<string, string | null>,
    ["*"]
  >({
    watch: ["*"],
  })

  const $config = useAdminConfigOptions({
    onError: (error) => {
      notify({
        title: "Failed to load instance config",
        content: error.code,
        severity: "error",
        icon: "error",
      })
    },
  })

  const config = createMemo(() => {
    const configMap: Record<string, IAdminConfigOption> = {}

    if ($config.data?.options) {
      for (const option of $config.data.options) {
        configMap[option.key] = option
      }
    }

    return configMap
  })

  const $updateConfigOption = createMutation(updateConfigOption)

  const setConfigOption = (key: string) => {
    const value = getValue(key) ?? ""

    $updateConfigOption.mutate(
      {
        key,
        value,
      },
      {
        onSuccess: () => {
          void queryClient.invalidateQueries([adminConfigOptionsKey])
          void queryClient.invalidateQueries([instanceConfigKey])
        },
      }
    )
  }

  const fieldWatchers = {
    "instance.name": watch("instance.name" as any),
    "instance.logo_url": watch("instance.logo_url" as any),
  } as const

  const isDirty = (key: keyof typeof fieldWatchers) =>
    fieldWatchers[key]() !== config()[key]?.value

  const resetField = (key: keyof typeof fieldWatchers) => {
    setValue(key as any, config()[key]?.value ?? "")
  }

  createEffect(
    on(
      () => $config.data?.options,
      () => {
        if ($config.data?.options) {
          for (const option of $config.data.options) {
            setValue(option.key, option.value)
          }
        }
      }
    )
  )

  return (
    <Container size="m" id="page-config">
      <Stack spacing={"2em"}>
        <Breadcrumbs>
          <Breadcrumb path={routes["/admin"]}>Administration</Breadcrumb>
          <Breadcrumb path={routes["/admin/config"]}>Configuration</Breadcrumb>
          <Breadcrumb path={routes["/admin/config/general"]}>
            General
          </Breadcrumb>
        </Breadcrumbs>

        <Stack spacing={"1.5em"}>
          <Card
            style={{
              padding: 0,
            }}
          >
            <Stack>
              <div class="config-section-header">
                <Text
                  variant="h2"
                  style={{
                    margin: "0",
                  }}
                >
                  Instance
                </Text>
                <Text
                  style={{
                    "font-size": "var(--text-sm)",
                    color: "var(--color-text-grey-05",
                  }}
                >
                  General instance configuration
                </Text>
              </div>
              <div class="config-setting-container row">
                <div class="left">
                  <Stack spacing={"0.33em"}>
                    <Text variant="body2" fontWeight={500}>
                      Display Name
                    </Text>
                    <OptionUpdatedText option={config()["instance.name"]} />
                  </Stack>
                </div>
                <div class="right">
                  <InputField
                    label="Name"
                    width="100%"
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    {...register("instance.name" as any)}
                  />
                  <Show when={isDirty("instance.name")}>
                    <Stack direction="row" spacing={"1em"}>
                      <Button
                        variant="text"
                        textColor="secondary"
                        leadingIcon="undo"
                        onClick={() => resetField("instance.name")}
                      >
                        Reset
                      </Button>
                      <Button
                        variant="primary"
                        onClick={() => setConfigOption("instance.name")}
                      >
                        Save
                      </Button>
                    </Stack>
                  </Show>
                </div>
              </div>
              <hr />
              <div class="config-setting-container row">
                <div class="left">
                  <Stack spacing={"0.33em"}>
                    <Text variant="body2" fontWeight={500}>
                      Instance Logo
                    </Text>
                    <OptionUpdatedText option={config()["instance.logo_url"]} />
                  </Stack>
                </div>
                <div class="right">
                  <InputField
                    label="URL"
                    width="100%"
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    {...register("instance.logo_url" as any)}
                  />
                  <Show when={isDirty("instance.logo_url")}>
                    <Stack direction="row" spacing={"1em"}>
                      <Button
                        variant="text"
                        textColor="secondary"
                        leadingIcon="undo"
                        onClick={() => resetField("instance.logo_url")}
                      >
                        Reset
                      </Button>
                      <Button
                        variant="primary"
                        onClick={() => setConfigOption("instance.logo_url")}
                      >
                        Save
                      </Button>
                    </Stack>
                  </Show>
                </div>
              </div>
            </Stack>
          </Card>
        </Stack>
      </Stack>
    </Container>
  )
}

export default ConfigGeneralPage
