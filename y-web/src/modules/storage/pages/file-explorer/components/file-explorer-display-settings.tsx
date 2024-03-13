/* eslint-disable unicorn/no-nested-ternary */
import { Component, Setter, batch, createSignal } from "solid-js"

import { DropdownPill } from "@/app/components/common/dropdown-pill/dropdown-pill"
import { Icon } from "@/app/components/common/icon/icon"
import { Stack } from "@/app/components/common/stack/stack"
import {
  Layout,
  SortBy,
  SortDirection,
} from "@/modules/storage/file-explorer/use-file-explorer-display-config"

export type FileExplorerDisplaySettingsProps = {
  sortDirection: SortDirection
  setSortDirection: Setter<SortDirection>

  layout: Layout
  setLayout: Setter<Layout>

  sortBy: SortBy
  setSortBy: Setter<SortBy>
}

export const FileExplorerDisplaySettings: Component<
  FileExplorerDisplaySettingsProps
> = (props) => {
  const [layoutDropdownExpanded, setLayoutDropdownExpanded] =
    createSignal(false)

  const [sortByDropdownExpanded, setSortByDropdownExpanded] =
    createSignal(false)

  return (
    <Stack direction="row" spacing="0.5em">
      <DropdownPill
        expanded={sortByDropdownExpanded()}
        onExpand={setSortByDropdownExpanded}
        icon={
          <Icon
            name={
              props.sortDirection === "asc" ? "arrow_upward" : "arrow_downward"
            }
            wght={600}
            size={12}
          />
        }
        content={
          <div class="items">
            <button
              class="item"
              onClick={() => {
                batch(() => {
                  if (props.sortBy === "name") {
                    // prettier-ignore
                    props.setSortDirection((value) =>
                      (value === "asc" ? "desc" : "asc")
                    )
                  } else {
                    props.setSortBy("name")
                    props.setSortDirection("desc")
                  }
                })
              }}
            >
              <div class="icon">
                <Icon name="match_case" size={14} wght={500} />
              </div>
              <div class="label">name</div>
            </button>

            <button
              class="item"
              onClick={() => {
                batch(() => {
                  if (props.sortBy === "mime_type") {
                    // prettier-ignore
                    props.setSortDirection((value) =>
                      (value === "asc" ? "desc" : "asc")
                    )
                  } else {
                    props.setSortBy("mime_type")
                    props.setSortDirection("desc")
                  }
                })
              }}
            >
              <div class="icon">
                <Icon name="picture_as_pdf" size={14} wght={500} />
              </div>
              <div class="label">MIME type</div>
            </button>

            <button
              class="item"
              onClick={() => {
                batch(() => {
                  if (props.sortBy === "size") {
                    // prettier-ignore
                    props.setSortDirection((value) =>
                      (value === "asc" ? "desc" : "asc")
                    )
                  } else {
                    props.setSortBy("size")
                    props.setSortDirection("desc")
                  }
                })
              }}
            >
              <div class="icon">
                <Icon name="weight" size={14} wght={500} />
              </div>
              <div class="label">file size</div>
            </button>
          </div>
        }
      >
        {props.sortBy === "mime_type"
          ? "MIME type"
          : props.sortBy === "name"
          ? "name"
          : "file size"}
      </DropdownPill>

      <DropdownPill
        expanded={layoutDropdownExpanded()}
        onExpand={setLayoutDropdownExpanded}
        icon={
          <Icon
            name={props.layout === "grid" ? "grid_view" : "view_agenda"}
            wght={600}
            size={12}
          />
        }
        content={
          <div class="items">
            <button
              class="item"
              onClick={() => {
                batch(() => {
                  props.setLayout("grid")
                  setLayoutDropdownExpanded(false)
                })
              }}
            >
              <div class="icon">
                <Icon name="grid_view" size={14} wght={500} />
              </div>
              <div class="label">grid</div>
            </button>

            <button
              class="item"
              onClick={() => {
                batch(() => {
                  props.setLayout("slates")
                  setLayoutDropdownExpanded(false)
                })
              }}
            >
              <div class="icon">
                <Icon name="view_agenda" size={14} wght={500} />
              </div>
              <div class="label">slates</div>
            </button>
          </div>
        }
      >
        {props.layout === "grid" ? "grid" : "slates"}
      </DropdownPill>
    </Stack>
  )
}
