import { Subject } from "rxjs"
import { HashHelper, genHashType } from "./hash"
import { UploadHelper, FileChunk, FileChunkDesc } from "./upload"

// this service save state
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

/**
 * upload large file
*/
export abstract class UploadLargeFile {
  abstract uploadAPI (data: UploadFileParams): Promise<any>
  abstract mergeAPI (data: FileMergeParams): Promise<any>
  abstract verifyAPI (data: verifyUploadFileParamas): Promise<{ shouldUpload: boolean, uploadedList: FileChunkDesc[] }>
  private state: UploadLargeFileState
  private shareState: UploadFileServiceShareState
  private hashHelper: HashHelper
  private uploadHelper: UploadHelper
  private cacheRequestList: Array<RequestInstance>
  public event = new Subject<UploadFileServiceShareState>()

  constructor (
    private genHashType: genHashType = "wasm",
    maxConnection = 4,
    tryRequestTimes = 3,
  ) {
    this.cacheRequestList = []
    this.state = {
      file: null,
      isUploading: false
    }
    this.shareState = {
      hashPercent: 0,
      canceled: false,
      fileChunksDesc: [],
    }
    // calc file hash helper
    this.hashHelper = new HashHelper(
      (hashPercent) => {
        if (!this.shareState.canceled) {
          this.shareState.hashPercent = hashPercent
          this.event.next({ ...this.shareState })
        }
      },
      50 * 1024 * 1024, // 50M
      10 * 1024 * 1024, // 5M
      1024 * 1024, // 1M
    )

    // upload chunks helper
    this.uploadHelper = new UploadHelper(
      (fileChunksDesc) => {
        this.shareState.fileChunksDesc = fileChunksDesc
        this.event.next({ ...this.shareState })
      },
      maxConnection,
      tryRequestTimes
    )
  }

  public stop() {
    if (
      this.shareState.canceled
      || !this.state.isUploading
    ) return
    console.log("stop");
    this.shareState.canceled = true
    this.shareState.hashPercent = 0
    this.shareState.fileChunksDesc = []
    this.hashHelper.stop()
    this.cacheRequestList.forEach(req => req?.abort())
    this.cacheRequestList = []
    this.event.next({ ...this.shareState })
    // after stop reset helper
    this.state.isUploading = false
    this.shareState.canceled = false
    this.event.next({ ...this.shareState })
    console.log("stop end");

  }

  // change file
  public changeFile (file: File) {
    this.state.file = file
  }

  public cacheRequest (item: RequestInstance) {
    this.cacheRequestList.push(item)
  }

  // upload file chunks
  public async upload () {
    if (
      this.state.file?.size === 0
      || this.state.isUploading
    ) return
    this.state.isUploading = true
    console.log("upload")
    const filehash = await this.hashHelper.genHash(this.genHashType, this.state.file)
    // network cache uploaded files
    const { shouldUpload, uploadedList } = await this.verifyAPI({
      filename: this.state.file.name,
      filehash,
    })
    if (!shouldUpload) {
      return
    }
    await this.uploadHelper.upload(
      this.state.file,
      uploadedList,
      (formData: FileChunk) => this.uploadAPI({ ...formData, filehash }),
    )
    await this.mergeAPI({ filename: this.state.file.name, filehash })
    console.log("upload end");
  }
}
