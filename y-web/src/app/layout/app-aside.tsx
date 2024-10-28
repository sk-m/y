import { createMemo } from "solid-js"

import { ComponentWithChildren } from "@/module"
import { useInstanceConfig } from "@/modules/core/instance-config/instance-config.service"

import { Stack } from "../components/common/stack/stack"
import "./app-aside.less"
import { AsideStorageUploadProgress } from "./components/aside-storage-upload-progress"
import { DomainSelector } from "./components/domain-selector"
import { InstanceLogo } from "./components/instance-logo"
import { UserIsland } from "./components/user-island"

export const AppAside: ComponentWithChildren = (props) => {
  const $instanceConfig = useInstanceConfig()

  const instanceName = createMemo(
    () =>
      $instanceConfig.data?.instance_config.find(
        (config) => config.key === "instance.name"
      )?.value
  )

  return (
    <div id="app-aside">
      <div class="section-top">
        <div class="instance-info">
          <InstanceLogo />
          <div class="instance-name">{instanceName()}</div>
        </div>

        <DomainSelector />
        <div class="dynamic-content">{props.children}</div>
      </div>
      <div class="section-bottom">
        <Stack spacing={"1em"}>
          <AsideStorageUploadProgress />
          <UserIsland />
        </Stack>
      </div>
    </div>
  )
}
