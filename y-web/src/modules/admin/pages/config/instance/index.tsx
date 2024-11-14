/* eslint-disable sonarjs/no-duplicate-string */
import { createEffect, createMemo, on, untrack } from "solid-js"

import { createMutation, useQueryClient } from "@tanstack/solid-query"

import { Button } from "@/app/components/common/button/button"
import { InputField } from "@/app/components/common/input-field/input-field"
import { Container } from "@/app/components/common/layout/container"
import { Stack } from "@/app/components/common/stack/stack"
import { useForm } from "@/app/core/use-form"
import { Breadcrumb, Breadcrumbs } from "@/app/layout/components/breadcrumbs"
import { routes } from "@/app/routes"
import { updateConfig } from "@/modules/admin/config/admin-config.api"
import { IAdminConfigOption } from "@/modules/admin/config/admin-config.codecs"
import {
  adminConfigOptionsKey,
  useAdminConfigOptions,
} from "@/modules/admin/config/admin-config.service"
import { instanceConfigKey } from "@/modules/core/instance-config/instance-config.service"

import {
  ConfigInputFieldWrapper,
  ConfigSection,
} from "../components/config-section"
import "../config-page.less"

// TODO having dots in the field name is a bad idea because useForm will treat those
// fields as if they are nested.
const fields = ["instance:name", "instance:logo_url"] as const
type FieldValues = { [key in (typeof fields)[number]]: string | null }

// TODO make logic reusable for all config pages. useConfigPage hook?
const ConfigInstancePage = () => {
  const queryClient = useQueryClient()

  const $updateConfigOption = createMutation(updateConfig)

  const { setValue, register, watch, submit } = useForm<
    FieldValues,
    typeof fields
  >({
    watch: fields,
    onSubmit: (rawNewConfig) => {
      const newConfig: Record<string, string> = {}

      for (const key in rawNewConfig) {
        newConfig[key.replaceAll(":", ".")] =
          rawNewConfig[key as keyof typeof rawNewConfig] ?? ""
      }

      $updateConfigOption.mutate(newConfig, {
        onSuccess: () => {
          void queryClient.invalidateQueries([adminConfigOptionsKey])
          void queryClient.invalidateQueries([instanceConfigKey])
        },
      })
    },
  })

  const $config = useAdminConfigOptions({})

  const config = createMemo(() => {
    const configMap: Record<string, IAdminConfigOption> = {}

    if ($config.data?.options) {
      for (const option of $config.data.options) {
        configMap[option.key.replaceAll(".", ":")] = option
      }
    }

    return configMap
  })

  const fieldWatchers = {
    "instance:name": watch("instance:name"),
    "instance:logo_url": watch("instance:logo_url"),
  } as const

  const isDirty = (key: keyof typeof fieldWatchers) =>
    fieldWatchers[key]() !== config()[key]?.value

  const resetField = (key: keyof typeof fieldWatchers) => {
    setValue(key, config()[key]?.value ?? "")
  }

  // TODO implement .reset() in use-form
  createEffect(
    on(
      () => $config.data?.options,
      () => {
        if ($config.data?.options) {
          for (const option of $config.data.options) {
            const key = option.key.replaceAll(".", ":") as keyof FieldValues

            untrack(() => {
              setValue(key, option.value)
            })
          }
        }
      }
    )
  )

  return (
    <Container
      size="s"
      id="page-config-instance"
      classList={{
        "page-config": true,
      }}
    >
      <Stack spacing={"2em"}>
        <Breadcrumbs>
          <Breadcrumb path={routes["/admin"]}>Administration</Breadcrumb>
          <Breadcrumb path={routes["/admin/config"]}>Configuration</Breadcrumb>
          <Breadcrumb path={routes["/admin/config/instance"]}>
            Instance
          </Breadcrumb>
        </Breadcrumbs>
        <Stack spacing={"4em"}>
          <ConfigSection
            title="Instance Identity"
            description="Define the name and the logo of this instance."
          >
            <Stack spacing={"1.5em"}>
              <ConfigInputFieldWrapper
                isDirty={isDirty("instance:name")}
                resetField={() => resetField("instance:name")}
              >
                <InputField
                  label="Display name"
                  width="66%"
                  {...register("instance:name")}
                />
              </ConfigInputFieldWrapper>
              <ConfigInputFieldWrapper
                isDirty={isDirty("instance:logo_url")}
                resetField={() => resetField("instance:logo_url")}
              >
                <InputField
                  label="Logo URL"
                  width="66%"
                  {...register("instance:logo_url")}
                />
              </ConfigInputFieldWrapper>
            </Stack>
          </ConfigSection>
        </Stack>
        <Stack direction="row" alignItems="center" justifyContent="flex-end">
          <Button onClick={submit}>Save config</Button>
        </Stack>
      </Stack>
    </Container>
  )
}

export default ConfigInstancePage
