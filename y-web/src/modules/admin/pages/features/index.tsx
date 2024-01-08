import { Component } from "solid-js"

import { Icon } from "@/app/components/common/icon/icon"
import { Container } from "@/app/components/common/layout/container"
import { Pill } from "@/app/components/common/pill/pill"
import { Text } from "@/app/components/common/text/text"
import { Toggle } from "@/app/components/common/toggle/toggle"

import folderSVG from "./assets/folder.svg"
import "./features.less"

const FeaturesPage: Component = () => {
  // eslint-disable-next-line unicorn/consistent-function-scoping
  const enabled = () => false

  return (
    <Container id="page-admin-features" size="s">
      <div class="page-title">
        <div class="icon">
          <Icon name="bolt" size={64} wght={500} fill={1} />
        </div>
        <div class="title">Features</div>

        <div class="spacer" />
      </div>

      <div class="features-list">
        <div
          classList={{
            feature: true,
            enabled: enabled(),
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
                  This feature is {enabled() ? "enabled" : "disabled"}
                </Text>
                <Toggle size="l" onChange={() => void 0} value={enabled()} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </Container>
  )
}

export default FeaturesPage
