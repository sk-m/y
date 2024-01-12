import { Component, Show, createEffect } from "solid-js"
import { createStore } from "solid-js/store"

import { useNavigate } from "@solidjs/router"
import { createMutation, useQueryClient } from "@tanstack/solid-query"

import { Icon } from "@/app/components/common/icon/icon"
import { Container } from "@/app/components/common/layout/container"
import { Pill } from "@/app/components/common/pill/pill"
import { Text } from "@/app/components/common/text/text"
import { Toggle } from "@/app/components/common/toggle/toggle"
import { genericErrorToast } from "@/app/core/util/toast-utils"
import { routes } from "@/app/routes"
import { useAuth } from "@/modules/core/auth/auth.service"

import { updateFeature } from "../../feature/feature.api"
import { featuresKey, useFeatures } from "../../feature/feature.service"
import folderSVG from "./assets/folder.svg"
import "./features.less"

const FeaturesPage: Component = () => {
  const $auth = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [state, setState] = createStore({
    storage: false,
  })

  const $features = useFeatures()
  const $updateFeature = createMutation(updateFeature)

  let featuresLoaded = false

  createEffect(() => {
    const pageAccessAllowed =
      $auth.data?.user_rights.some(
        (right) => right.right_name === "update_features"
      ) ?? false

    if (!pageAccessAllowed) navigate(routes["/admin"])
  })

  createEffect(() => {
    if (!featuresLoaded && $features.data) {
      for (const feature of $features.data.features) {
        // eslint-disable-next-line sonarjs/no-small-switch
        switch (feature.feature) {
          case "storage": {
            setState("storage", feature.enabled)
            break
          }
        }
      }

      featuresLoaded = true
    }
  })

  const updateFeatureStatus = (feature: string, enabled: boolean) => {
    $updateFeature.mutate(
      {
        feature,
        enabled,
      },
      {
        onSuccess: () => {
          void queryClient.invalidateQueries([featuresKey])
        },
        onError: (error) => genericErrorToast(error),
      }
    )
  }

  return (
    <Container id="page-admin-features" size="s">
      <div class="page-title">
        <div class="icon">
          <Icon name="bolt" size={64} wght={500} fill={1} />
        </div>
        <div class="title">Features</div>

        <div class="spacer" />
      </div>

      <Show when={$features.isSuccess}>
        <div class="features-list">
          <div
            classList={{
              feature: true,
              enabled: state.storage,
            }}
          >
            <div class="main-content">
              <div class="graphic">
                <div class="graphic-container">
                  <div class="graphic-icon">
                    <Icon
                      name="folder_zip"
                      size={72}
                      wght={500}
                      grad={24}
                      fill={1}
                    />
                  </div>
                  <div
                    class="background-icon"
                    style={{
                      "background-image": `url(${folderSVG})`,
                    }}
                  />
                </div>
              </div>
              <div class="content">
                <div class="main-info">
                  <Text variant="h1">Storage</Text>
                  <Pill
                    variant="warning"
                    style={{
                      "margin-top": "-0.5em",
                    }}
                  >
                    Alpha
                  </Pill>
                  <Text>
                    Store files on y, with fast uploads and downloads, granular
                    access management, flexible configuration, automatic media
                    conversion, quick sharing, and more.
                  </Text>
                </div>
                <div class="status">
                  <Text variant="secondary">
                    This feature is {state.storage ? "enabled" : "disabled"}
                  </Text>
                  <Toggle
                    size="l"
                    onChange={(enabled) => {
                      if (state.storage !== enabled) {
                        setState("storage", enabled)
                        void updateFeatureStatus("storage", enabled)
                      }
                    }}
                    value={() => state.storage}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </Show>
    </Container>
  )
}

export default FeaturesPage
