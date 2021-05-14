import { Subject } from "rxjs"
import { HashHelper, genHashType } from "./hash"
import { UploadHelper, FileChunk, FileChunkDesc } from "./upload"



// this service save state
export interface UploadLargeFileState {
  file: File
}

export interface UploadFileServiceShareState {
  fileChunksDesc: FileChunkDesc[] // startIdx endIdx
  hashPercent: number // calc hash percent
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

export abstract class UploadLargeFile {
  private state: UploadLargeFileState = {
    file: null
  }
  private shardState: UploadFileServiceShareState = {
    hashPercent: 0,
    fileChunksDesc: [],
  }
  // calc file hash helper
  private hashHelper = new HashHelper((hashPercent) => {
    this.shardState.hashPercent = hashPercent
    this.event.next({ ...this.shardState })
  })

  // upload chunks helper
  private uploadHelper = new UploadHelper((fileChunksDesc) => {
    this.shardState.fileChunksDesc = fileChunksDesc
    this.event.next({ ...this.shardState })
  })

  abstract uploadAPI (data: UploadFileParams): Promise<any>
  abstract mergeAPI (data: FileMergeParams): Promise<any>
  abstract verifyAPI (data: verifyUploadFileParamas): Promise<{
    shouldUpload: boolean,
    uploadedList: FileChunkDesc[]
  }>

  public event = new Subject<UploadFileServiceShareState>()

  constructor (
    private genHashType: genHashType = "wasm",
    private maxConnection = 4,
    private tryRequestTimes = 3,
    public SIZE = 100 * 1024 * 1024
  ) {
    //
  }

  // change file
  public changeFile (file: File) {
    this.state.file = file
  }

  // upload file chunks
  public async uploadFileChunk () {
    if (this.state.file.size === 0) return
    console.time("hash")
    const filehash = await this.hashHelper.genHash(this.genHashType, this.state.file)
    console.timeEnd("hash")
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
      (formData: FileChunk) => (this.uploadAPI({ ...formData, filehash })),
    )
    // await this.mergeAPI({ filename: this.state.file.name, filehash })
  }
}
