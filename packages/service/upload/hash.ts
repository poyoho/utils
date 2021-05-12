import { FileChunk } from "./upload-large-file"

export type genHashType = "worker" | "wasm"
export class HashHelper {
  constructor(private cb?: (percent: number) => void) {}

  public genHash (
    type: genHashType,
    chunks: FileChunk[],
  ) {
    switch(type) {
      case "worker":
        return this.genHashByWorker(chunks)
      case "wasm":
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

  private genHashByNone (chunks: FileChunk[], hash: any, end: any): Promise<string> {
    let count = 0
    const loadFileChunk = () => {
      return new Promise(resolve => {
        const reader = new FileReader()
        reader.readAsArrayBuffer(chunks[count].chunk)
        reader.onload = (e: ProgressEvent<FileReader>) => {
          hash(e.target.result)
          if (count === chunks.length - 1) {
            this.cb(100)
            end()
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

  // by request idle callback
  private async genHashByASM (chunks: FileChunk[]): Promise<string> {
    const wasm = await import("../third/wasm/hash/hash")
    await wasm.default()
    wasm.greet()
    const hashHelper = wasm.HashHelper.new()
    this.genHashByNone(
      chunks,
      (data: any) => {
        hashHelper.append(new Uint8Array(data))
      },
      () => {
        console.log(hashHelper.end())
      }
    )
    return "hash"
  }
}
