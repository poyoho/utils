import { Subject } from "rxjs"

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
}

// merge file chunk params
export interface MergeParams {
  size: number
  filename: string
}

// this service save state
export interface UploadLargeFileState {
  file: File
  chunks: FileChunk[]
}

export interface UploadFileServiceShareState {
  fileChunksDesc: FileChunkDesc[]
}


export abstract class UploadLargeFile {
  private state: UploadLargeFileState = {
    file: null,
    chunks: []
  }
  private shardState: UploadFileServiceShareState = {
    fileChunksDesc: []
  }
  public event = new Subject<UploadFileServiceShareState>()

  abstract uploadAPI (data: FileChunk): Promise<any>
  abstract mergeAPI (data: MergeParams): Promise<any>

  constructor (public SIZE = 10 * 1024 * 1024) {
    //
  }

  // change file
  public changeFile (file: File) {
    this.state.file = file
    this.state.chunks = []
  }

  // chunk large file
  public createFileChunk () {
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
    this.event.next({
      ...this.shardState,
      fileChunksDesc: this.state.chunks.map(fileChunk => ({
        name: fileChunk.hash,
        size: fileChunk.chunk.size,
      }))
    })
  }

  // upload file chunks
  public async uploadFileChunk () {
    if (!this.state.chunks.length) return
    await Promise.all(
      this.state.chunks.map(formData => this.uploadAPI(formData))
    )
    await this.mergeAPI({ size: this.SIZE, filename: this.state.file.name })
  }
}
