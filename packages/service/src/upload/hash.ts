import Spark from "spark-md5"
import { FileChunk } from "./upload-large-file"

export type genHashType = "worker" | "webasm" | "none"

export class HashHelper {
  constructor(private cb?: (percent: number) => void) {}

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
      case "webasm":
        return this.genHashByASM(chunks)
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
            this.cb(100)
            resolve(spark.end())
          } else {
            this.cb(count * 100 / chunks.length)
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
                percent: 100,
                hash: spark.end()
              })
            } else {
              this.postMessage({
                percent: count * 100 / fileChunks.length,
              })
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
        if (e.data.percent === 100) {
          resolve(e.data.hash)
        }
        this.cb(e.data.percent)
      }
    })
  }

  // by request idle callback
  private async genHashByASM (chunks: FileChunk[]): Promise<string> {
    // TODO
    return ""
  }
}
