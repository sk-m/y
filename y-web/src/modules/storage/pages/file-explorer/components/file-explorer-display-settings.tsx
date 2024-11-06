/* eslint-disable unicorn/no-nested-ternary */
import {
  Component,
  Setter,
  batch,
  createSignal,
  onCleanup,
  onMount,
} from "solid-js"

import { DropdownPill } from "@/app/components/common/dropdown-pill/dropdown-pill"
import { Icon } from "@/app/components/common/icon/icon"
import { Stack } from "@/app/components/common/stack/stack"
import {
  FILE_EXPLORER_ENTRY_WIDTH_DEFAULT,
  FILE_EXPLORER_ENTRY_WIDTH_MAX,
  FILE_EXPLORER_ENTRY_WIDTH_MIN,
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

  entrySize: number
  setEntrySize: Setter<number>
}

export const FileExplorerDisplaySettings: Component<
  FileExplorerDisplaySettingsProps
> = (props) => {
  let entrySizeSliderRef: HTMLInputElement

  const [layoutDropdownExpanded, setLayoutDropdownExpanded] =
    createSignal(false)

  const [sortByDropdownExpanded, setSortByDropdownExpanded] =
    createSignal(false)

  const sizeScrollHandler = (event: WheelEvent) => {
    // eslint-disable-next-line @typescript-eslint/no-magic-numbers
    const amount = event.shiftKey ? 10 : 1
    const delta = event.deltaY > 0 ? amount * -1 : amount

    const value = Math.min(
      Math.max(props.entrySize + delta, FILE_EXPLORER_ENTRY_WIDTH_MIN),
      FILE_EXPLORER_ENTRY_WIDTH_MAX
    )

    props.setEntrySize(value)
  }

  onMount(() => {
    document.addEventListener("wheel", sizeScrollHandler, {
      passive: true,
    })

    onCleanup(() => {
      document.removeEventListener("wheel", sizeScrollHandler)
    })
  })

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

            <button
              class="item"
              onClick={() => {
                batch(() => {
                  if (props.sortBy === "created_at") {
                    // prettier-ignore
                    props.setSortDirection((value) =>
                      (value === "asc" ? "desc" : "asc")
                    )
                  } else {
                    props.setSortBy("created_at")
                    props.setSortDirection("desc")
                  }
                })
              }}
            >
              <div class="icon">
                <Icon name="schedule" size={14} wght={500} />
              </div>
              <div class="label">creation date</div>
            </button>
          </div>
        }
      >
        {props.sortBy === "mime_type"
          ? "MIME type"
          : props.sortBy === "name"
          ? "name"
          : props.sortBy === "created_at"
          ? "creation date"
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

      <datalist id="entry-size-slider-detents">
        <option value={FILE_EXPLORER_ENTRY_WIDTH_DEFAULT} />
      </datalist>
      <div class="entry-size-slider-container">
        <input
          ref={entrySizeSliderRef!}
          class="entry-size-slider"
          type="range"
          min={FILE_EXPLORER_ENTRY_WIDTH_MIN}
          max={FILE_EXPLORER_ENTRY_WIDTH_MAX}
          value={props.entrySize}
          list="entry-size-slider-detents"
          onInput={(event) =>
            props.setEntrySize(event.currentTarget.valueAsNumber)
          }
        />
      </div>
    </Stack>
  )
}
