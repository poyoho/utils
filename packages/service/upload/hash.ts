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
    this.onmessage = (e) => {
      const { fileChunks } = e.data
      const spark = new this.SparkMD5.ArrayBuffer();
      let count = 0
      function loadFileChunk () {
        const reader = new FileReader()
        reader.readAsArrayBuffer(fileChunks[count].chunk)
        reader.onload = (ev) => {
          console.time("chunk");
          spark.append(new Uint8Array(ev.target.result as any))
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
            count++
            loadFileChunk()
          }
        }
      }
      loadFileChunk()
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

  // gen hash by master thread
  private genHashByNone (
    chunks: FileChunk[],
    helper: {
      append: (data: string | ArrayBuffer) => void,
      end: () => void
    }): Promise<string> {
    let count = 0
    const loadFileChunk = () => {
      return new Promise(resolve => {
        const reader = new FileReader()
        reader.readAsArrayBuffer(chunks[count].chunk)
        reader.onload = (e: ProgressEvent<FileReader>) => {
          helper.append(e.target.result)
          if (count === chunks.length - 1) {
            this.cb(100)
            helper.end()
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
