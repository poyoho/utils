import { genHashType,useFileHashCalculator } from "./hash"
import { FileChunk, FileChunkDesc,useLargeFileUploader } from "./upload"

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

export type StateCallback = (state: UploadFileServiceShareState) => void

export function useLargeFileHashAndUploader(
  api: {
    uploadAPI: (data: UploadFileParams) => Promise<any>,
    mergeAPI: (data: FileMergeParams) => Promise<any>,
    verifyAPI: (data: verifyUploadFileParamas) => Promise<{ shouldUpload: boolean, uploadedList: FileChunkDesc[] }>,
  },
  opts: {
    genHashType: genHashType
    maxConnection: number
    tryRequestTimes: number
  } = {
    genHashType: "wasm",
    maxConnection: 4,
    tryRequestTimes: 3
  }
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
  let eventCb: StateCallback = () => {}

  const _emit = (state: UploadFileServiceShareState) => {
    eventCb(state)
  }

  const subscribe = (cb: StateCallback) => {
    eventCb = cb
  }

  // const event = new Subject<UploadFileServiceShareState>()
  const uploadHelper = useLargeFileUploader(
    (fileChunksDesc) => {
      shareState.fileChunksDesc = fileChunksDesc
      _emit({ ...shareState })
    },
    opts.maxConnection,
    opts.tryRequestTimes
  )
  const hashHelper = useFileHashCalculator(
    (hashPercent) => {
      if (!shareState.canceled) {
        shareState.hashPercent = hashPercent
        _emit({ ...shareState })
      }
    },
    {
      FILE_OFFSET: 50 * 1024 * 1024, // 50M
      CHUNK_OFFSET: 10 * 1024 * 1024, // 5M
      CALC_CHUNK: 1024 * 1024 // 1M
    }
  )

  const stop = () => {
    if (
      shareState.canceled
      || !state.isUploading
    ) {
      return
    }
    shareState.canceled = true
    shareState.fileChunksDesc = []
    state.step === 1 && hashHelper.stop() // hash calc and stop hash calculator
    state.step === 3 && uploadHelper.stop() // file upload and stop uploader
    state.step = 0
    _emit({ ...shareState })
    console.log("uploader stop")
  }

  const reset = () => {
    // after stop reset helper
    state.isUploading = false
    shareState.canceled = false
    shareState.fileChunksDesc = []
    shareState.hashPercent = 0
    _emit({ ...shareState })
    console.log("uploader reset")
  }

  // upload file chunks
  const upload = async () => {
    if (
      state.file?.size === 0
      || state.isUploading
      || shareState.canceled
    ) {
      return
    }
    console.log("upload")
    shareState.hashPercent = 0
    state.isUploading = true
    state.step = 0
    if (shareState.canceled) {
      reset()
      return
    }
    state.step = 1
    const filehash = await hashHelper.genHash(opts.genHashType, state.file)
    if (shareState.canceled) {
      reset()
      return
    }
    state.step = 2
    const { shouldUpload, uploadedList } = await api.verifyAPI({
      filename: state.file.name,
      filehash,
    })
    if (shareState.canceled) {
      reset()
      return
    }
    if (!shouldUpload) {
      shareState.fileChunksDesc = [{
        startIdx: 0,
        endIdx: state.file.size,
        status: "uploaded"
      }]
      _emit({ ...shareState })
      reset()
      return
    }
    state.step = 3
    await uploadHelper.upload(
      state.file,
      uploadedList,
      (formData: FileChunk) => api.uploadAPI({ ...formData, filehash })
    )
    if (shareState.canceled) {
      reset()
      return
    }
    state.step = 4
    await api.mergeAPI({ filename: state.file.name, filehash })
    reset()
  }

  return {
    subscribe,

    reset,
    upload,
    stop,
    // change file
    changeFile (file: File) {
      state.file = file
    }
  }
}
