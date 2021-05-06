import { FileChunk } from "./upload-large-file"

export type genHashType = "worker" | "webasm"
export class HashHelper {
  constructor(private cb?: (percent: number) => void) {}

  public genHash (
    type: genHashType,
    chunks: FileChunk[],
  ) {
    switch(type) {
      case "worker":
        return this.genHashByWorker(chunks)
      case "webasm":
        return this.genHashByASM(chunks)
    }
  }

  // by worker
  private genHashByWorker (chunks: FileChunk[]): Promise<string> {
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
      const spark = new URL("../third/spark-md5.min.js", import.meta.url)

      const workerData = new Blob(
        [`self.importScripts("${spark}");\n` + `(${_worker.toString()})()`],
        { type: "text/javascript" }
      )
      const worker = new Worker(URL.createObjectURL(workerData))
      worker.postMessage({
        fileChunks: chunks,
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
