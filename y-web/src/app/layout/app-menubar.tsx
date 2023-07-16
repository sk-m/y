import { Component } from "solid-js"

import { InstanceLogo } from "@/app/layout/components/instance-logo"

import styles from "./app-menubar.module.less"

export const AppMenubar: Component = () => {
  return (
    <div id="app-menubar" class={styles.appMenubar}>
      <div class={styles.content}>
        <div class={styles.left}>
          <div class={styles.instanceInfo}>
            <InstanceLogo />
            <div class={styles.instanceName}>{"y"}</div>
          </div>
        </div>
        <div class={styles.middle} />
        <div class={styles.right} />
      </div>
    </div>
  )
}
