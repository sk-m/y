export type FileWithPath = File & { path: string }

export const retrieveFiles = async (
  item: Partial<FileSystemFileEntry> & Partial<FileSystemDirectoryEntry>,
  array: FileWithPath[] = [],
  path = ""
): Promise<FileWithPath[]> => {
  return new Promise((resolve) => {
    if (item.isFile && item.file) {
      item.file((file) => {
        // prettier-ignore
        (file as FileWithPath).path = path
        resolve([...array, file as FileWithPath])
      })
      // eslint-disable-next-line sonarjs/elseif-without-else
    } else if (item.isDirectory && item.createReader) {
      // eslint-disable-next-line @typescript-eslint/no-misused-promises
      item.createReader().readEntries(async (entries) => {
        for (const entry of entries) {
          // eslint-disable-next-line require-atomic-updates, no-await-in-loop, no-param-reassign
          array = await retrieveFiles(
            entry,
            array,
            `${path + (item.name ?? "")}/`
          )
        }
        resolve(array)
      })
    }
  })
}
