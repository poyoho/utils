import { PromiseTryAllWithMax } from "@poyoho/shared-service/promise"

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
// 删除展示fileChunk分片进度 只 share 已经上传size
// 使用itor进行切片 yield根据上次返回值进行resize切片大小
export class UploadHelper {

  constructor(
    private cb: (fileChunkDesc: FileChunkDesc[]) => void = () => {},
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

  private filterUploadedFileChunks(file:File, uploadedFileList: FileChunkDesc[]): FileChunk[] {
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
    const push = (startIdx: number, endIdx: number, status: UploadStatus) =>
      fileChunks.push({
        startIdx, endIdx, status,
        chunk: file.slice(startIdx, endIdx),
        filename: file.name,
      })
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

  private *dynamicSize(file: File, fileChunks: FileChunk[]): Iterator<FileChunk, void, FileChunk> {
    const FILE_OFFSET = 200 * 1024 * 1024

    const calcSpeed = (fileChunk: FileChunk, start: number) => {
      const time = Number(((new Date().getTime() - start) / 1000).toFixed(4))
      const size = (fileChunk.endIdx - fileChunk.startIdx) / 1024 / 1024
      return size / time
    }

    for(let idx = 0; idx < fileChunks.length; idx++) {
      const fileChunk = fileChunks[idx]
      if(fileChunk.status === "pass") continue
      const size = fileChunk.endIdx - fileChunk.startIdx
      if (size > FILE_OFFSET) {
        // slice
        for(let cur = fileChunk.startIdx; cur < fileChunk.endIdx; cur += FILE_OFFSET) {
          const curEnd = cur + FILE_OFFSET > fileChunk.chunk.size ? fileChunk.chunk.size : cur + FILE_OFFSET
          const start = new Date().getTime()
          yield {
            startIdx: cur,
            endIdx: curEnd,
            status: "ready",
            chunk: file.slice(cur, curEnd),
            filename: file.name,
          }
          const speed = calcSpeed(fileChunk, start)
          // console.log(speed, "MB/s");
        }
      } else {
        const start = new Date().getTime()
        yield fileChunk
        const speed = calcSpeed(fileChunk, start)
        // console.log(speed, "MB/s");
      }
    }
  }

  // Promise.all with control of concurrent connections and try times
  private tryAllWithMax (uploadChunks: (() => Promise<any>)[], maxConnection: number, tryRequest: number) {
    return PromiseTryAllWithMax(uploadChunks, maxConnection, tryRequest)
  }

  // slow start upload
  private async slowStart(file: File, uploadedFileList: FileChunkDesc[], uploadAPI: UploadAPI) {
    const fileChunks = this.filterUploadedFileChunks(file, uploadedFileList)
    const fileChunksIteror = this.dynamicSize(file, fileChunks)
    while (true) {
      const fileChunk = fileChunksIteror.next()
      if (fileChunk.done) { break }
      await uploadAPI(fileChunk.value as FileChunk)
    }
  }
}
