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
      console.log("🚀", fileChunk.startIdx, fileChunk.endIdx)
      if (size > fileOffset) {
        // slice
        console.log("slice big chunk: ", fileChunk.startIdx, fileChunk.endIdx)
        for(let cur = fileChunk.startIdx; cur < fileChunk.endIdx;) {
          const curEnd = cur + fileOffset > fileChunk.endIdx ? fileChunk.endIdx : cur + fileOffset
          console.log("🔪", cur, curEnd)
          const newOffset = yield {
            startIdx: cur,
            endIdx: curEnd,
            status: "ready",
            chunk: file.slice(cur, curEnd),
            filename: file.name,
          }
          cur = curEnd
          fileOffset = newOffset
        }
      } else {
        const newOffset = yield fileChunk
        fileOffset = newOffset
      }
    }
  }

  private resize(offset: number, start: number) {
    const time = Number(((new Date().getTime() - start) / 1000).toFixed(4))
    let rate = time / 5
    if(rate < 0.5) rate = 0.5
    else if(rate > 2) rate = 2
    offset = Math.ceil(offset / rate)
    return offset
  }

  private async requestResizeChunk (
    chunk: FileChunk,
    offset: number,
    uploadAPI: UploadAPI,
  ) {
    const start = Date.now()
    const resp = await uploadAPI(chunk)
    const fileOffset = this.resize(offset, start)
    return { resp, fileOffset }
  }

  // Promise.all with control of concurrent connections and try times
  private requestWithConcurrent (
    chunkItor: Iterator<FileChunk, void, number>,
    fileOffset: number,
    uploadAPI: UploadAPI,
  ) {
    let max = this.maxConnection
    return new Promise((resolve, reject) => {
      const result = []
      const next = () => {
        console.log("📃file offset", fileOffset)
        const chunkItorResult = chunkItor.next(fileOffset)
        if (chunkItorResult.done) {
          if (max === 1) { // the last thread finish
            console.log("😀finish")
            resolve(result)
          } else {
            max--
          }
          return
        }
        const chunk = chunkItorResult.value as FileChunk
        console.log("🧶chunk: ", chunk);
        this.requestResizeChunk(chunk, fileOffset, uploadAPI)
          .then(res => {
            fileOffset = res.fileOffset
            result.push(res.resp)
          })
          .catch((err) => {
            reject(err)
          })
          .finally(() => {
            chunk.status = "uploaded"
            this.cb([chunk])
            next()
          })
      }
      Array(max).fill(1).forEach(() => next())
    })
  }

  // slow start upload
  private async slowStart(file: File, uploadedFileList: FileChunkDesc[], uploadAPI: UploadAPI) {
    const fileOffset = 10 * 1024 * 1024 // file chunks start 10M start
    const fileChunks = this.filterUploadedFileChunks(file, uploadedFileList)
    const fileChunksIteror = this.dynamicSize(file, fileChunks, fileOffset)
    const res = await this.requestWithConcurrent(fileChunksIteror, fileOffset, uploadAPI)
    console.log("slowStart: exit", res)
  }
}
