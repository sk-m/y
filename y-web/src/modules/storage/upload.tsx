export type FileWithPath = File & { path: string }

// TODO this is experimental. Refactor before the next release
export const retrieveFiles = async (
  item: Partial<FileSystemFileEntry> & Partial<FileSystemDirectoryEntry>,
  array: FileWithPath[] = [],
  path = ""
): Promise<FileWithPath[]> => {
  // eslint-disable-next-line @typescript-eslint/no-misused-promises, no-async-promise-executor
  return new Promise(async (resolve) => {
    if (item.isFile && item.file) {
      item.file((file) => {
        // prettier-ignore
        (file as FileWithPath).path = path
        resolve([...array, file as FileWithPath])
      })
      // eslint-disable-next-line sonarjs/elseif-without-else
    } else if (item.isDirectory && item.createReader) {
      const reader = item.createReader()
      let continueReading = true
      let lastBatchSize = 0

      const readAndAppend = async (): Promise<FileWithPath[]> => {
        return new Promise((resolveRead) => {
          // eslint-disable-next-line @typescript-eslint/no-misused-promises
          reader.readEntries(async (entries) => {
            for (const entry of entries) {
              // eslint-disable-next-line require-atomic-updates, no-await-in-loop, no-param-reassign
              array = await retrieveFiles(
                entry,
                array,
                `${path + (item.name ?? "")}/`
              )
            }

            resolveRead(array)
          })
        })
      }

      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      while (continueReading) {
        // eslint-disable-next-line no-await-in-loop
        const batch = await readAndAppend()

        if (lastBatchSize === batch.length) {
          continueReading = false
          break
        }

        lastBatchSize = batch.length
      }

      resolve(array)
    }
  })
}
