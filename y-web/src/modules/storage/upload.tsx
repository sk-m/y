/* eslint-disable sonarjs/elseif-without-else */
export type FileWithPath = File & { path: string }

export const retrieveFiles = async (
  item: Partial<FileSystemFileEntry> & Partial<FileSystemDirectoryEntry>,
  array: FileWithPath[],
  path = ""
): Promise<void> => {
  // eslint-disable-next-line @typescript-eslint/no-misused-promises, no-async-promise-executor
  return new Promise(async (resolve) => {
    if (item.isFile && item.file) {
      item.file((file) => {
        // prettier-ignore
        (file as FileWithPath).path = path

        array.push(file as FileWithPath)

        resolve()
      })
    } else if (item.isDirectory && item.createReader) {
      const reader = item.createReader()
      let continueReading = true
      let lastBatchSize = 0

      const readAndAppend = async (): Promise<number> => {
        return new Promise((resolveRead) => {
          // eslint-disable-next-line @typescript-eslint/no-misused-promises
          reader.readEntries(async (entries) => {
            for (const entry of entries) {
              // eslint-disable-next-line no-await-in-loop
              await retrieveFiles(entry, array, `${path + (item.name ?? "")}/`)
            }

            resolveRead(array.length)
          })
        })
      }

      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      while (continueReading) {
        // eslint-disable-next-line no-await-in-loop
        const batchSize = await readAndAppend()

        if (lastBatchSize === batchSize) {
          continueReading = false
          break
        }

        lastBatchSize = batchSize
      }

      resolve()
    }
  })
}
