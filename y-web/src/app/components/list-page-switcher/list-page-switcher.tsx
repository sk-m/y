import { Component, Setter, Show } from "solid-js"

import { CreateQueryResult } from "@tanstack/solid-query"

import { Button } from "../common/button/button"
import "./list-page-switcher.less"

export type ListPageSwitcherProps = {
  totalCount: number
  rowsPerPage: number
  currentPage: number
  onPageChange: Setter<number>

  currentCount?: number
  query?: CreateQueryResult
}

export const ListPageSwitcher: Component<ListPageSwitcherProps> = (props) => {
  const totalPages = () => Math.max(1, props.totalCount / props.rowsPerPage)

  const canGoBack = () => props.currentPage > 0
  const canGoForward = () => props.currentPage + 1 < totalPages()

  const goBack = () => {
    // eslint-disable-next-line solid/reactivity
    props.onPageChange((page) => (canGoBack() ? page - 1 : page))
  }

  const goForward = () => {
    // eslint-disable-next-line solid/reactivity
    props.onPageChange((page) => {
      return canGoForward() ? page + 1 : page
    })
  }

  return (
    <div class="ui-list-page-switcher">
      <div class="status">
        <Show
          when={
            props.query &&
            (props.query.isLoading ||
              props.query.isFetching ||
              props.query.isRefetching)
          }
        >
          <div
            classList={{
              "status-text": true,
              loading: true,
            }}
          >
            updating...
          </div>
        </Show>

        <Show
          when={props.currentCount && props.currentCount !== props.totalCount}
        >
          <div class="info-text">{props.currentCount} entries found</div>
        </Show>

        <div class="info-text">{props.totalCount} entries total</div>
      </div>

      <div>
        <div class="info-text">
          Page {props.currentPage + 1} of {totalPages()}
        </div>

        <Button
          style={{
            padding: "0.1em 0.2em",
            opacity: canGoBack() ? "1" : "0.25",
          }}
          disabled={!canGoBack()}
          leadingIcon="chevron_left"
          variant="secondary"
          onClick={goBack}
        />
        <Button
          style={{
            padding: "0.1em 0.2em",

            opacity: canGoForward() ? "1" : "0.25",
          }}
          disabled={!canGoForward()}
          leadingIcon="chevron_right"
          variant="secondary"
          onClick={goForward}
        />
      </div>
    </div>
  )
}
