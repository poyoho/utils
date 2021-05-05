import { Subject } from "rxjs"
import { HashHelper, genHashType } from "./hash"
import { UploadHelper } from "./upload"

// file chunk
export interface FileChunk {
  index: number
  chunk: Blob
  hash: string
  filename: string
}

// descript file chunk
export interface FileChunkDesc {
  name: string
  size: number
  percent: number
}

// merge file chunk params
export interface FileMergeParams {
  filename: string
  filehash: string
}

// this service save state
export interface UploadLargeFileState {
  file: File
  chunks: FileChunk[]
}

export interface UploadFileServiceShareState {
  fileChunksDesc: FileChunkDesc[]
  hashPercent: number
}

export interface verifyUploadFileParamas {
  filename: string
  filehash: string
}

export interface UploadFileParams extends FileChunk {
  filehash: string
}

export abstract class UploadLargeFile {
  private state: UploadLargeFileState = {
    file: null,
    chunks: []
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
  private uploadHelper = new UploadHelper()

  abstract uploadAPI (data: UploadFileParams): Promise<any>
  abstract mergeAPI (data: FileMergeParams): Promise<any>
  abstract verifyAPI (data: verifyUploadFileParamas): Promise<{
    shouldUpload: boolean,
    uploadedList: string[]
  }>

  public event = new Subject<UploadFileServiceShareState>()

  constructor (
    private genHashType: genHashType,
    private sparkMd5CDN: string,
    private maxConnection = 4,
    private tryRequest = 3,
    public SIZE = 1024 // * 1024 * 1024
  ) {
    //
  }

  // change file
  public changeFile (file: File) {
    this.state.file = file
    this.state.chunks = []
  }

  // upload file chunks
  public async uploadFileChunk () {
    this.createFileChunk()
    if (!this.state.chunks.length) return
    const filehash = await this.hashHelper.genHash(this.genHashType, this.state.chunks, this.sparkMd5CDN)
    // network cache uploaded files
    const { shouldUpload, uploadedList } = await this.verifyAPI({
      filename: this.state.file.name,
      filehash,
    })
    // if (!shouldUpload) {
    //   // reflush progress
    //   this.shardState.fileChunksDesc = this.state.chunks.map(el => ({
    //     percent: 102,
    //     name: el.hash,
    //     size: el.chunk.size
    //   }))
    //   this.event.next({ ...this.shardState })
    //   return
    // }
    // uploading
    const fileChunksDesc: FileChunkDesc[] = []
    const uploadChunks = this.state.chunks
      .filter(el => {
        if (uploadedList.includes(el.hash)) {
          fileChunksDesc.push({
            name: el.hash,
            size: el.chunk.size,
            percent: 101
          })
          return false
        } else {
          fileChunksDesc.push({
            name: el.hash,
            size: el.chunk.size,
            percent: 0
          })
          return true
        }
      })
      .map(formData => () => this.uploadAPI({ ...formData, filehash }))
    this.shardState.fileChunksDesc = fileChunksDesc
    this.event.next({ ...this.shardState })
    await this.uploadHelper.tryAllWithMax(uploadChunks, this.maxConnection, this.tryRequest)

    await this.mergeAPI({ filename: this.state.file.name, filehash })
    this.shardState.fileChunksDesc = fileChunksDesc.map(el => (el.percent = 102) && el)
    this.event.next({ ...this.shardState })
  }

  // chunk large file
  private createFileChunk () {
    if (!this.state.file) return
    const chunkList = [] as Blob[]
    for (let cur = 0; cur < this.state.file.size; cur += this.SIZE) {
      chunkList.push(this.state.file.slice(cur, cur + this.SIZE))
    }
    this.state.chunks = chunkList.map((chunk, index) => ({
      index,
      chunk,
      filename: this.state.file.name,
      hash: this.state.file.name + "-" + index
    }))
  }
}
