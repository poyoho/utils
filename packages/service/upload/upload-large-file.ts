import { Subject } from "rxjs"
import { useFileHashCalculator, genHashType } from "./hash"
import { useLargeFileUploader, FileChunk, FileChunkDesc } from "./upload"

// service save state
export interface UploadLargeFileState {
  file: File
  isUploading: boolean
}

export interface UploadFileServiceShareState {
  fileChunksDesc: FileChunkDesc[] // startIdx endIdx
  hashPercent: number // calc hash percent
  canceled: boolean // has it been cancelled
}

export interface UploadFileParams extends FileChunk {
  filehash: string
}

// merge file chunk params
export interface FileMergeParams {
  filename: string
  filehash: string
}

export interface verifyUploadFileParamas {
  filename: string
  filehash: string
}

// stop runner
export type RequestInstance = { abort(): void; }

export function useLargeFileHashAndUploader(
  uploadAPI: (data: UploadFileParams) => Promise<any>,
  mergeAPI: (data: FileMergeParams) => Promise<any>,
  verifyAPI: (data: verifyUploadFileParamas) => Promise<{ shouldUpload: boolean, uploadedList: FileChunkDesc[] }>,
  genHashType: genHashType = "wasm",
  maxConnection = 4,
  tryRequestTimes = 3,
) {
  const state = {
    file: null,
    isUploading: false,
    step: 0,
  }
  const shareState = {
    hashPercent: 0,
    canceled: false,
    fileChunksDesc: [],
  }
  const event = new Subject<UploadFileServiceShareState>()
  const uploadHelper = useLargeFileUploader(
    (fileChunksDesc) => {
      shareState.fileChunksDesc = fileChunksDesc
      event.next({ ...shareState })
    },
    maxConnection,
    tryRequestTimes
  )
  const hashHelper = useFileHashCalculator(
    (hashPercent) => {
    if (!shareState.canceled) {
      shareState.hashPercent = hashPercent
      event.next({ ...shareState })
    }
    },
    50 * 1024 * 1024, // 50M
    10 * 1024 * 1024, // 5M
    1024 * 1024, // 1M
  )

  const stop = () => {
    if (
      shareState.canceled
      || !state.isUploading
    ) return
    shareState.canceled = true
    shareState.fileChunksDesc = []
    state.step === 1 && hashHelper.stop() // hash calc and stop hash calculator
    state.step === 3 && uploadHelper.stop() // file upload and stop uploader
    state.step = 0
    event.next({ ...shareState })
    console.log("uploader stop")
  }

  const reset = () => {
    // after stop reset helper
    state.isUploading = false
    shareState.canceled = false
    shareState.fileChunksDesc = []
    shareState.hashPercent = 0
    event.next({ ...shareState })
    console.log("uploader reset")
  }

  // upload file chunks
  const upload = async () => {
    if (
      state.file?.size === 0
      || state.isUploading
      || shareState.canceled
    ) return
    console.log("upload")
    shareState.hashPercent = 0
    state.isUploading = true
    state.step = 0
    if (shareState.canceled) return reset()
    state.step = 1
    const filehash = await hashHelper.genHash(genHashType, state.file)
    if (shareState.canceled) return reset()
    state.step = 2
    const { shouldUpload, uploadedList } = await verifyAPI({
      filename: state.file.name,
      filehash,
    })
    if (shareState.canceled) return reset()
    if (!shouldUpload) {
      shareState.fileChunksDesc = [{
        startIdx: 0,
        endIdx: state.file.size,
        status: "uploaded"
      }]
      event.next({ ...shareState })
      return reset()
    }
    state.step = 3
    await uploadHelper.upload(
      state.file,
      uploadedList,
      (formData: FileChunk) => uploadAPI({ ...formData, filehash }),
    )
    if (shareState.canceled) return reset()
    state.step = 4
    await mergeAPI({ filename: state.file.name, filehash })
    return reset()
  }

  return {
    event,

    reset,
    upload,
    stop,
    // change file
    changeFile (file: File) {
      state.file = file
    }
  }
}
