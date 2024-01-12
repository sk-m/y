/* eslint-disable sonarjs/no-duplicate-string */
import { Component } from "solid-js"

import { Container } from "@/app/components/common/layout/container"
import { Link } from "@/app/components/common/link/link"
import { Stack } from "@/app/components/common/stack/stack"
import { Text } from "@/app/components/common/text/text"
import * as VERSION from "@/version.json"

const AboutPage: Component = () => {
  return (
    <Container
      size="xs"
      style={{
        height: "99%",
        display: "flex",
        "align-items": "center",
        "justify-content": "center",
      }}
    >
      <Stack alignItems="center" spacing={"1em"}>
        <Text variant="h1">y</Text>
        <Text variant="secondary" fontSize={"var(--text-sm)"}>
          {VERSION.version}
        </Text>
        <Stack direction="row" alignItems="center" spacing={"1em"}>
          <Link
            variant="text"
            style={{
              "font-size": "var(--text-sm)",
            }}
            href="https://github.com/sk-m/y"
          >
            Source code
          </Link>
          <Link
            variant="text"
            style={{
              "font-size": "var(--text-sm)",
            }}
            href={`https://github.com/sk-m/y/releases/tag/${VERSION.version}`}
          >
            Release Notes
          </Link>
        </Stack>
      </Stack>
    </Container>
  )
}

export default AboutPage
