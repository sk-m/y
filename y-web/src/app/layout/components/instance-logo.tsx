/* eslint-disable no-undefined */
import { Component, createMemo } from "solid-js"

import { useInstanceConfig } from "@/modules/core/instance-config/instance-config.service"

export const InstanceLogo: Component = () => {
  const $instanceConfig = useInstanceConfig()

  const instanceLogoURL = createMemo(
    () =>
      $instanceConfig.data?.instance_config.find(
        (config) => config.key === "instance.logo_url"
      )?.value
  )

  return (
    <img
      style={{
        width: "42px",
        height: "42px",
        "object-fit": "contain",
        "user-select": "none",
      }}
      draggable={false}
      src={instanceLogoURL() ?? undefined}
      alt="Logo"
    />
  )
}
