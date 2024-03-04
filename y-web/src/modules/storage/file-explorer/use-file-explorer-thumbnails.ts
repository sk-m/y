import {
  createEffect,
  createMemo,
  createSignal,
  on,
  onCleanup,
  onMount,
} from "solid-js"

import { genericErrorToast } from "@/app/core/util/toast-utils"
import { storageEntryThumbnails } from "@/modules/storage/storage-entry/storage-entry.api"
import { IStorageEntry } from "@/modules/storage/storage-entry/storage-entry.codecs"

const THUMBNAILS_PER_LOAD_REQUEST = 200
const SCROLL_THUMBNAILS_LOAD_DEBOUNCE_MS = 200

export type UseFileExplorerThumbnailsProps = {
  endpointId: () => number

  browserContentsRef: () => HTMLDivElement
  entryRefs: () => HTMLDivElement[]

  entries: () => IStorageEntry[]
}

export const useFileExplorerThumbnails = (
  props: UseFileExplorerThumbnailsProps
) => {
  const [thumbnails, setThumbnails] = createSignal<Record<string, string>>({})
  const [lastThumbnailIndex, setLastThumbnailIndex] = createSignal(0)

  const fileIds = createMemo(() =>
    props
      .entries()
      .filter((entry) => entry.entry_type === "file")
      .map((entry) => entry.id)
  )

  const getNextThumbnails = async () => {
    const fromIndex = lastThumbnailIndex()
    const toIndex = fromIndex + THUMBNAILS_PER_LOAD_REQUEST

    if (fileIds().length === 0) {
      setLastThumbnailIndex(toIndex)
      return
    }

    // Don't load thumbnails that we have already loaded
    const entryIds = fileIds()
      .slice(fromIndex, toIndex)
      .filter((id) => !thumbnails()[id])

    if (entryIds.length === 0) {
      setLastThumbnailIndex(toIndex)
      return
    }

    const newThumbnailsResponse = await storageEntryThumbnails({
      endpointId: props.endpointId(),
      entryIds,
    }).catch((error) => {
      const errorCode = (error as { code: string }).code

      if (errorCode === "storage.entry_thumbnails.artifacts_disabled") {
        return
      }

      genericErrorToast(error)
    })

    setThumbnails((previous) => ({
      ...previous,
      ...newThumbnailsResponse?.thumbnails,
    }))

    setLastThumbnailIndex(toIndex)
  }

  /**
   * @returns {Promise<boolean>} Whether or not new thumbnails were loaded. If `false`, we have already loaded all of them for this view (scroll position).
   */
  const checkAndLoad = async () => {
    // eslint-disable-next-line sonarjs/no-empty-collection
    const elementWithLastThumbnail = props.entryRefs()[lastThumbnailIndex()]

    if (elementWithLastThumbnail) {
      const elementRect = elementWithLastThumbnail.getBoundingClientRect()

      if (elementRect.top < window.innerHeight) {
        await getNextThumbnails()

        return true
      }
    }

    return false
  }

  onMount(() => {
    let debounce = 0

    const handler = () => {
      clearTimeout(debounce)

      debounce = setTimeout(async () => {
        let shouldLoadMore = true

        while (shouldLoadMore) {
          // eslint-disable-next-line no-await-in-loop
          shouldLoadMore = await checkAndLoad()
        }
      }, SCROLL_THUMBNAILS_LOAD_DEBOUNCE_MS)
    }

    props.browserContentsRef().addEventListener("scroll", handler)

    onCleanup(() => {
      props.browserContentsRef().removeEventListener("scroll", handler)
    })
  })

  createEffect(
    on(fileIds, async () => {
      setLastThumbnailIndex(0)

      if (fileIds().length > 0) {
        let shouldLoadMore = true

        while (shouldLoadMore) {
          // eslint-disable-next-line no-await-in-loop
          shouldLoadMore = await checkAndLoad()
        }
      }
    })
  )

  return {
    thumbnails,
  }
}
