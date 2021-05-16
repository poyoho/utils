// upload status
export type UploadStatus = "pass" | "ready" | "uploading" | "uploaded"

export interface FileChunkDesc {
  startIdx: number
  endIdx: number
  status: UploadStatus
}

// file chunk
export interface FileChunk extends FileChunkDesc{
  chunk: Blob
  filename: string
}

export type UploadAPI = (formData: FileChunk) => Promise<any>

// uploading
export class UploadHelper {
  constructor(
    private cb: (fileChunkDesc: FileChunkDesc[]) => void = () => {},
    private maxConnection = 4,
    private tryRequestTimes = 3,
  ) {}

  async upload(
    file: File,
    uploadedFileList: FileChunkDesc[],
    uploadAPI: UploadAPI,
    maxConnection: number = 4,
    tryRequestTimes: number = 3
  ) {
    await this.slowStart(file, uploadedFileList, uploadAPI)
  }

  private filterUploadedFileChunks(file: File, uploadedFileList: FileChunkDesc[]): FileChunk[] {
    if (uploadedFileList.length === 0) {
      const fileChunks: FileChunk[] = [{
        startIdx: 0,
        endIdx: file.size,
        status: "ready",
        chunk: file,
        filename: file.name,
      }]
      this.cb(fileChunks)
      return fileChunks
    }
    const fileChunks: FileChunk[] = []
    const push = (startIdx: number, endIdx: number, status: UploadStatus) => {
      fileChunks.push({
        startIdx, endIdx, status,
        chunk: file.slice(startIdx, endIdx),
        filename: file.name,
      })
    }
    const endIdx = uploadedFileList.sort((a, b) => a.startIdx - b.startIdx).reduce((prev, next) => {
      if (next.startIdx > prev) {
        push(prev, next.startIdx, "ready")
      }
      push(next.startIdx, next.endIdx, "pass")
      return next.endIdx
    }, 0)
    if (file.size > endIdx) {
      push(endIdx, file.size, "ready")
    }
    this.cb(fileChunks)
    return fileChunks
  }

  private *dynamicSize(
    file: File,
    fileChunks: FileChunk[],
    fileOffset: number
  ): Iterator<FileChunk, void, number> {
    for(let idx = 0; idx < fileChunks.length; idx++) {
      const fileChunk = fileChunks[idx]
      if (fileChunk.status === "pass") continue
      const size = fileChunk.endIdx - fileChunk.startIdx
      console.log("size and file offset: ", size, fileOffset)
      if (size > fileOffset) {
        // slice
        for(let cur = fileChunk.startIdx; cur < fileChunk.endIdx;) {
          const curEnd = cur + fileOffset > fileChunk.endIdx ? fileChunk.endIdx : cur + fileOffset
          console.log("slice big chunk: ", cur, curEnd)
          const newOffset = yield {
            startIdx: cur,
            endIdx: curEnd,
            status: "ready",
            chunk: file.slice(cur, curEnd),
            filename: file.name,
          }
          cur += fileOffset
          fileOffset = newOffset
        }
      } else {
        console.log("upload small chunk: ", fileChunk)
        const newOffset = yield fileChunk
        fileOffset = newOffset
      }
    }
  }

  private resize(offset: number, start: number) {
    const time = Number(((new Date().getTime() - start) / 1000).toFixed(4))
    let rate = time / 5
    if(rate < 0.5) rate = 0.5
    if(rate > 2) rate = 2
    offset = Math.ceil(offset / rate)
    return offset
  }

  private async requestResizeChunk (
    chunk: FileChunk,
    uploadAPI: UploadAPI,
    offset: number
  ) {
    const start = Date.now()
    await uploadAPI(chunk)
    return this.resize(offset, start)
  }

  // Promise.all with control of concurrent connections and try times
  private tryAllWithMax (chunkItor: Iterator<FileChunk, void, number>, ) {

  }

  // slow start upload
  private async slowStart(file: File, uploadedFileList: FileChunkDesc[], uploadAPI: UploadAPI) {
    let fileOffset = 10 * 1024 * 1024 // file chunks start 10M start
    const fileChunks = this.filterUploadedFileChunks(file, uploadedFileList)
    const fileChunksIteror = this.dynamicSize(file, fileChunks, fileOffset)
    while (true) {
      // TODO resize FILE_OFFSET
      console.log("📃file offset", fileOffset)
      const fileChunk = fileChunksIteror.next(fileOffset)
      if (fileChunk.done) break
      const chunk = fileChunk.value as FileChunk
      fileOffset = await this.requestResizeChunk(chunk, uploadAPI, fileOffset)
      chunk.status = "uploaded"
      this.cb([chunk])
    }
    console.log("slowStart: exit")
  }
}
