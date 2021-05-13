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

  // worker string function
  private _worker (this: any) {
    this.onmessage = async (e) => {
      const { fileChunks } = e.data
      const spark = new this.SparkMD5.ArrayBuffer();
      for(let count = 0; count < fileChunks.length; count++) {
        console.time("chunk");
        const buff = await fileChunks[count].chunk.arrayBuffer()
        spark.append(new Uint8Array(buff))
        console.timeEnd("chunk");
        if (count === fileChunks.length - 1) {
          this.postMessage({
            action: "percent",
            percent: 100,
            hash: spark.end()
          })
        } else {
          this.postMessage({
            action: "percent",
            percent: count * 100 / fileChunks.length,
          })
        }
      }
    }
  }

  // gen hash by worker
  private genHashByWorker (chunks: FileChunk[]): Promise<string> {
    return new Promise(resolve => {
      const spark = new URL("../third/spark-md5.min.js", import.meta.url)
      const workerData = new Blob(
        [
          `self.importScripts("${spark}");\n`,
          `(function ${this._worker.toString()})()`
        ],
        { type: "text/javascript" }
      )
      const worker = new Worker(URL.createObjectURL(workerData))
      worker.postMessage({
        fileChunks: chunks,
      })
      worker.onmessage = (e) => {
        if (e.data.percent === 100) {
          console.log(e.data.hash);
          resolve(e.data.hash)
        }
        this.cb(e.data.percent)
      }
    })
  }

  // by request idle callback
  private async genHashByASM (chunks: FileChunk[]): Promise<string> {
    const sparkSite = new URL("../third/wasm/hash/hash.js", import.meta.url)
    const wasmSite = new URL('../third/wasm/hash/hash_bg.wasm', import.meta.url);
    const callWorker = this._worker.toString()
      .replace("const spark = new this.SparkMD5.ArrayBuffer();", "const spark = wasm_bindgen.HashHelper.new();")

    return new Promise(resolve => {
      const workerData = new Blob(
        [
          `self.importScripts("${sparkSite}");\n`,
          `wasm_bindgen("${wasmSite}").then(() => this.postMessage({ action: "init" }));\n`,
          `(function ${callWorker})()`
        ],
        { type: "text/javascript" }
      )
      const worker = new Worker(URL.createObjectURL(workerData))
      worker.onmessage = (e) => {
        switch(e.data.action) {
          case "init":
            worker.postMessage({
              fileChunks: chunks,
            })
            break
          case "percent":
            if (e.data.percent === 100) {
              console.log(e.data.hash);
              resolve(e.data.hash)
            }
            this.cb(e.data.percent)
            break
        }
      }
    })
  }
}
