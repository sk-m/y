import { Card } from "@/app/components/common/card/card"
import { Stack } from "@/app/components/common/stack/stack"
import { Text } from "@/app/components/common/text/text"
import { unsafe_t } from "@/i18n"
import { ComponentWithChildren } from "@/module"

import { IUserRightCategory } from "../../user-rights/user-rights.codecs"

export type UserGroupRightCategoryProps = {
  category: IUserRightCategory
}

export const UserGroupRightCategory: ComponentWithChildren<
  UserGroupRightCategoryProps
> = (props) => {
  return (
    <Card
      style={{
        padding: 0,
      }}
    >
      <Stack>
        <Stack
          style={{
            padding: "1.25em 1.5em",
          }}
          spacing="0.5em"
        >
          <Text
            variant="h2"
            style={{
              margin: "0",
            }}
          >
            {unsafe_t(`main.userRightCategory.${props.category.name}.name`)}
          </Text>
          <Text
            style={{
              "font-size": "var(--text-sm)",
              color: "var(--color-text-grey-05",
            }}
          >
            {unsafe_t(
              `main.userRightCategory.${props.category.name}.description`
            )}
          </Text>
        </Stack>
        {props.children}
      </Stack>
    </Card>
  )
}
