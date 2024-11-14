/* eslint-disable @typescript-eslint/no-magic-numbers */

/* eslint-disable sonarjs/no-duplicate-string */
import { createEffect, createMemo, on, untrack } from "solid-js"

import { createMutation, useQueryClient } from "@tanstack/solid-query"

import { Button } from "@/app/components/common/button/button"
import { Checkbox } from "@/app/components/common/checkbox/checkbox"
import { InputField } from "@/app/components/common/input-field/input-field"
import { Container } from "@/app/components/common/layout/container"
import { Stack } from "@/app/components/common/stack/stack"
import { toastCtl } from "@/app/core/toast"
import { useForm } from "@/app/core/use-form"
import { validateInt } from "@/app/core/use-form.utils"
import { genericErrorToast } from "@/app/core/util/toast-utils"
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
const fields = [
  "storage:generate_thumbnails:image",
  "storage:generate_thumbnails:video",
  "storage:generate_thumbnails:audio",
  "storage:generate_seeking_thumbnails:enabled",
  "storage:generate_seeking_thumbnails:desired_frames",
  "storage:transcode_videos:enabled",
  "storage:transcode_videos:target_height",
  "storage:transcode_videos:target_bitrate",
] as const
type FieldValues = { [key in (typeof fields)[number]]: string | null }

const ConfigStoragePage = () => {
  const queryClient = useQueryClient()
  const { notify } = toastCtl

  const $updateConfigOption = createMutation(updateConfig)

  const { setValue, register, watch, submit, errors } = useForm<
    FieldValues,
    typeof fields
  >({
    watch: fields,
    onSubmit: (rawNewConfig) => {
      const newConfig: Record<string, string> = {}

      for (const key in rawNewConfig) {
        newConfig[key.replaceAll(":", ".")] =
          rawNewConfig[key as keyof typeof rawNewConfig]?.toString() ?? ""
      }

      $updateConfigOption.mutate(newConfig, {
        onSuccess: () => {
          void queryClient.invalidateQueries([adminConfigOptionsKey])
          void queryClient.invalidateQueries([instanceConfigKey])

          notify({
            title: "Saved",
            icon: "check",
            severity: "success",
          })
        },
        onError: (error) => genericErrorToast(error),
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
    "storage:generate_thumbnails:image": watch(
      "storage:generate_thumbnails:image"
    ),
    "storage:generate_thumbnails:video": watch(
      "storage:generate_thumbnails:video"
    ),
    "storage:generate_thumbnails:audio": watch(
      "storage:generate_thumbnails:audio"
    ),
    "storage:generate_seeking_thumbnails:enabled": watch(
      "storage:generate_seeking_thumbnails:enabled"
    ),
    "storage:generate_seeking_thumbnails:desired_frames": watch(
      "storage:generate_seeking_thumbnails:desired_frames"
    ),
    "storage:transcode_videos:enabled": watch(
      "storage:transcode_videos:enabled"
    ),
    "storage:transcode_videos:target_height": watch(
      "storage:transcode_videos:target_height"
    ),
    "storage:transcode_videos:target_bitrate": watch(
      "storage:transcode_videos:target_bitrate"
    ),
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
      id="page-config-storage"
      classList={{
        "page-config": true,
      }}
    >
      <Stack spacing={"2em"}>
        <Breadcrumbs>
          <Breadcrumb path={routes["/admin"]}>Administration</Breadcrumb>
          <Breadcrumb path={routes["/admin/config"]}>Configuration</Breadcrumb>
          <Breadcrumb path={routes["/admin/config/storage"]}>
            Storage
          </Breadcrumb>
        </Breadcrumbs>
        <Stack spacing={"4em"}>
          <ConfigSection
            title="Thumbnails"
            description="y can generate thumbnails for different kids of uploaded files, such as videos or images. Generated thumbnails do not take much space and are very useful, but you can disable them if you so desire."
          >
            <Stack spacing={"1em"}>
              <Stack direction="row" spacing={"0.66em"} alignItems="center">
                <Checkbox
                  checkedLabel="Enabled"
                  size="l"
                  {...register("storage:generate_thumbnails:image")}
                />
                <div class="toggle-field-name">Image files</div>
              </Stack>
              <Stack direction="row" spacing={"0.66em"} alignItems="center">
                <Checkbox
                  checkedLabel="Enabled"
                  size="l"
                  {...register("storage:generate_thumbnails:video")}
                />
                <div class="toggle-field-name">Video files</div>
              </Stack>
              <Stack direction="row" spacing={"0.66em"} alignItems="center">
                <Checkbox
                  checkedLabel="Enabled"
                  size="l"
                  {...register("storage:generate_thumbnails:audio")}
                />
                <div class="toggle-field-name">Audio files</div>
              </Stack>
            </Stack>
          </ConfigSection>
          <ConfigSection
            title="Seeking thumbnails for videos"
            description="Seeking thumbnails allow users to preview the contents of a video file by dragging a cursor over it on the files page. Extracting video frames for this feature takes a bit of processing time, which depends on the length of the video."
          >
            <Stack spacing={"1.5em"}>
              <Stack direction="row" spacing={"0.66em"} alignItems="center">
                <Checkbox
                  checkedLabel="Enabled"
                  size="l"
                  {...register("storage:generate_seeking_thumbnails:enabled")}
                />
                <div class="toggle-field-name">Generate seeking thumbnails</div>
              </Stack>
              <ConfigInputFieldWrapper
                isDirty={isDirty(
                  "storage:generate_seeking_thumbnails:desired_frames"
                )}
                resetField={() =>
                  resetField(
                    "storage:generate_seeking_thumbnails:desired_frames"
                  )
                }
              >
                <InputField
                  label="Number of frames"
                  type="number"
                  inputProps={{
                    min: 2,
                    max: 50,
                  }}
                  error={
                    errors()[
                      "storage:generate_seeking_thumbnails:desired_frames"
                    ]
                  }
                  {...register(
                    "storage:generate_seeking_thumbnails:desired_frames",
                    {
                      validate: (value: string) => {
                        if (value === "") return false

                        const asInt = validateInt(value)

                        if (asInt === false) return "Invalid number"

                        if (asInt < 2 || asInt > 50) {
                          return "Number of frames must be between 2 and 50."
                        }
                      },
                    }
                  )}
                />
              </ConfigInputFieldWrapper>
            </Stack>
          </ConfigSection>
          <ConfigSection
            title="Video transcoding"
            description="y can transcode all uploaded video files, making them playable directly in a browsers and optimizing them for streaming."
          >
            <Stack spacing={"1.5em"}>
              <Stack direction="row" spacing={"0.66em"} alignItems="center">
                <Checkbox
                  checkedLabel="Enabled"
                  size="l"
                  {...register("storage:transcode_videos:enabled")}
                />
                <div class="toggle-field-name">Transcode videos</div>
              </Stack>
              <ConfigInputFieldWrapper
                isDirty={isDirty("storage:transcode_videos:target_height")}
                resetField={() =>
                  resetField("storage:transcode_videos:target_height")
                }
              >
                <InputField
                  label="Target height (px)"
                  type="number"
                  subtext="Width will be calculated to preserve the aspect ratio."
                  inputProps={{
                    min: 144,
                    max: 2160,
                  }}
                  error={errors()["storage:transcode_videos:target_height"]}
                  {...register("storage:transcode_videos:target_height", {
                    validate: (value: string) => {
                      if (value === "") return false

                      const asInt = validateInt(value)

                      if (asInt === false) return "Invalid number"

                      if (asInt < 144 || asInt > 2160) {
                        return "Height must be between 144 and 2160 px."
                      }
                    },
                  })}
                />
              </ConfigInputFieldWrapper>
              <ConfigInputFieldWrapper
                isDirty={isDirty("storage:transcode_videos:target_bitrate")}
                resetField={() =>
                  resetField("storage:transcode_videos:target_bitrate")
                }
              >
                <InputField
                  label="Target bitrate (Kbits/s)"
                  type="number"
                  inputProps={{
                    min: 100,
                    max: 50_000,
                  }}
                  error={errors()["storage:transcode_videos:target_bitrate"]}
                  {...register("storage:transcode_videos:target_bitrate", {
                    validate: (value: string) => {
                      if (value === "") return false

                      const asInt = validateInt(value)

                      if (asInt === false) return "Invalid number"

                      if (asInt < 100 || asInt > 50_000) {
                        return "Target bitrate must be between 100 and 50000 kbps."
                      }
                    },
                  })}
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

export default ConfigStoragePage
