import { Subject } from "rxjs"
import Spark from "spark-md5"
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
export interface MergeParams {
  size: number
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
}

export interface verifyUploadParamas {
  filename: string
  filehash: string
}

export interface UploadParams extends FileChunk {
  filehash: string
}

export type genHashType = "worker" | "requestIdleCallback" | "none"

export abstract class UploadLargeFile {
  private state: UploadLargeFileState = {
    file: null,
    chunks: []
  }
  private shardState: UploadFileServiceShareState = {
    fileChunksDesc: []
  }
  private hashHelper = new HashHelper()
  abstract uploadAPI (data: UploadParams): Promise<any>
  abstract mergeAPI (data: MergeParams): Promise<any>
  abstract verifyAPI (data: verifyUploadParamas): Promise<{
    shouldUpload: boolean,
    uploadedList: string[]
  }>

  public event = new Subject<UploadFileServiceShareState>()

  constructor (
    private genHashType: genHashType,
    private sparkMd5CDN: string,
    public SIZE = 10 * 1024 * 1024
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
    if (!shouldUpload) {
      return
    }
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
      .map(formData => this.uploadAPI({ ...formData, filehash }))

    this.event.next({ ...this.shardState, fileChunksDesc })
    await Promise.all(uploadChunks)
    await this.mergeAPI({ size: this.SIZE, filename: this.state.file.name, filehash })
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


class HashHelper {

  public genHash (
    type: genHashType,
    chunks: FileChunk[],
    sparkMd5CDN?: string
  ) {
    switch(type) {
      case "none": return this.genHashByNone(chunks)
      case "worker":
        if (!sparkMd5CDN) throw "must had sparkMd5CDN!"
        return this.genHashByWorker(chunks, sparkMd5CDN)
      case "requestIdleCallback":
        return this.genHashByRIC(chunks)
    }
  }

  // generate file content hash
  private genHashByNone (chunks: FileChunk[]): Promise<string> {
    const spark = new Spark.ArrayBuffer()
    let count = 0
    function loadFileChunk () {
      return new Promise(resolve => {
        const reader = new FileReader()
        reader.readAsArrayBuffer(chunks[count].chunk)
        reader.onload = (e: ProgressEvent<FileReader>) => {
          spark.append(e.target.result as globalThis.ArrayBuffer)
          if (count === chunks.length - 1) {
            resolve(spark.end())
          } else {
            count++
            resolve(loadFileChunk())
          }
        }
      })
    }
    return loadFileChunk() as Promise<string>
  }

  // by worker
  private genHashByWorker (chunks: FileChunk[], sparkMd5CDN: string): Promise<string> {
    // string function
    function _worker () {
      this.onmessage = (e) => {
        const { fileChunks } = e.data
        const spark = new this.SparkMD5.ArrayBuffer();
        let count = 0
        function loadFileChunk () {
          const reader = new FileReader()
          reader.readAsArrayBuffer(fileChunks[count].chunk)
          reader.onload = (e) => {
            spark.append(e.target.result as globalThis.ArrayBuffer)
            if (count === fileChunks.length - 1) {
              this.postMessage({
                hash: spark.end()
              })
            } else {
              count++
              loadFileChunk()
            }
          }
        }
        loadFileChunk()
      }
    }
    return new Promise(resolve => {
      const workerData = new Blob(
        [`self.importScripts("${sparkMd5CDN}");\n` + `(${_worker.toString()})()`],
        { type: "text/javascript" }
      )
      const worker = new Worker(URL.createObjectURL(workerData))
      const spark = new Spark.ArrayBuffer()
      worker.postMessage({
        fileChunks: chunks,
        fileSpark: spark
      })
      worker.onmessage = (e) => {
        resolve(e.data.hash)
      }
    })
  }

  // by request idle callback
  private async genHashByRIC (chunks: FileChunk[]): Promise<string> {
    // TODO
    return ""
  }
}