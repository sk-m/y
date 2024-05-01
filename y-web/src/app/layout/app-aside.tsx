import { ComponentWithChildren } from "@/module"

import { Stack } from "../components/common/stack/stack"
import "./app-aside.less"
import { AsideStorageUploadProgress } from "./components/aside-storage-upload-progress"
import { DomainSelector } from "./components/domain-selector"
import { InstanceLogo } from "./components/instance-logo"
import { UserIsland } from "./components/user-island"

export const AppAside: ComponentWithChildren = (props) => {
  return (
    <div id="app-aside">
      <div class="section-top">
        <div class="instance-info">
          <InstanceLogo />
          <div class="instance-name">{"y"}</div>
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
