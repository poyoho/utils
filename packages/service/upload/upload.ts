// upload status
export type UploadStatus = "pass" | "ready" | "uploading" | "uploaded" | "error"

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

export type UploadHelper = {
  stop(): void;
  upload(file: File, uploadedFileList: FileChunkDesc[], uploadAPI: UploadAPI): Promise<void>;
}

// resize upload chunk size
function resize(offset: number, start: number) {
  const time = Number(((new Date().getTime() - start) / 1000).toFixed(4))
  let rate = time / 5
  if(rate < 0.5) rate = 0.5
  else if(rate > 2) rate = 2
  offset = Math.ceil(offset / rate)
  return offset
}

//
function *dynamicCutFileChunks(
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

export function useLargeFileUploader(
  cb: (fileChunkDesc: FileChunkDesc[]) => void = () => {},
  maxConnection = 4,
  tryRequestTimes = 3,
) {
  let canceled = false

  function _filterUploadedFileChunks(file: File, uploadedFileList: FileChunkDesc[]): FileChunk[] {
    if (uploadedFileList.length === 0) {
      const fileChunks: FileChunk[] = [{
        startIdx: 0,
        endIdx: file.size,
        status: "ready",
        chunk: file,
        filename: file.name,
      }]
      cb(fileChunks)
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
    cb(fileChunks)
    return fileChunks
  }

  async function requestResizeChunk (
    chunk: FileChunk,
    offset: number,
    uploadAPI: UploadAPI,
  ) {
    let resp: any
    let errorTimes = tryRequestTimes
    let start: number
    while (errorTimes) {
      start = Date.now()
      try {
        resp = await uploadAPI(chunk)
        chunk.status = "uploaded"
        cb([chunk])
        break
      } catch (error) {
        resp = error
        chunk.status = "ready"
        cb([chunk])
        errorTimes--
        console.log("❌ error retry", tryRequestTimes - errorTimes);
      }
    }
    if (chunk.status === "ready") {
      chunk.status = "error"
      cb([chunk])
    }
    const fileOffset = resize(offset, start)
    return { resp, fileOffset }
  }

  // Promise.all with control of concurrent connections and try times
  function _requestWithConcurrent (
    chunkItor: Iterator<FileChunk, void, number>,
    fileOffset: number,
    uploadAPI: UploadAPI,
  ) {
    let max = maxConnection
    return new Promise((resolve) => {
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
        requestResizeChunk(chunk, fileOffset, uploadAPI)
          .then(res => {
            fileOffset = res.fileOffset
            result.push(res.resp)
          })
          .finally(() => {
            if (canceled) {
              chunkItor.return()
            }
            next()
          })
      }
      Array(max).fill(1).forEach(() => next())
    })
  }

  // slow start upload
  async function _slowStart(file: File, uploadedFileList: FileChunkDesc[], uploadAPI: UploadAPI) {
    const fileOffset = 10 * 1024 * 1024 // file chunks start 10M start
    const fileChunks = _filterUploadedFileChunks(file, uploadedFileList)
    const fileChunksIteror = dynamicCutFileChunks(file, fileChunks, fileOffset)
    const res = await _requestWithConcurrent(fileChunksIteror, fileOffset, uploadAPI)
    return res
  }

  return {
    stop () {
      canceled = true
    },
    async upload(
      file: File,
      uploadedFileList: FileChunkDesc[],
      uploadAPI: UploadAPI,
    ) {
      await _slowStart(file, uploadedFileList, uploadAPI)
      canceled = false
      console.log("upload helper exit")
    }
  }
}
