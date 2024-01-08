import { Component } from "solid-js"

import { InstanceLogo } from "@/app/layout/components/instance-logo"

import "./app-menubar.less"
import { DomainSelector } from "./components/domain-selector"
import { UserIsland } from "./components/user-island"

export const AppMenubar: Component = () => {
  return (
    <div id="app-menubar">
      <div class="content">
        <div class="left">
          <div class="instance-info">
            <InstanceLogo />
            <div class="instance-name">{"y"}</div>
          </div>
          <DomainSelector />
        </div>
        <div class="middle" />
        <div class="right">
          <UserIsland />
        </div>
      </div>
    </div>
  )
}
