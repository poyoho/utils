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

    // similar to the Bloom filter, take part of the data as a hash
    async function *bloomFilter(file: File): AsyncGenerator<{
      buff: Uint8Array,
      nowIdx: number
    }> {
      for(let idx=0; idx < chunks.length; idx++) {
        const buff = await chunks[idx].chunk.arrayBuffer()
        yield {
          buff: new Uint8Array(buff),
          nowIdx: idx
        }
      }
    }

    this.onmessage = async (e) => {
      const { file } = e.data
      const spark = new this.SparkMD5.ArrayBuffer();
      const fileChunksIteror = bloomFilter(file)
      while (true) {
        const fileChunk = await fileChunksIteror.next()
        if (fileChunk.done) { break }
        console.time("chunk")
        const { buff, nowIdx } = fileChunk.value
        spark.append(buff)
        console.timeEnd("chunk")
        this.postMessage({
          action: "percent",
          percent: nowIdx / file.size,
        })
      }
      this.postMessage({
        action: "percent",
        percent: 100,
        hash: spark.end()
      })
    }
  }

  // gen hash by worker
  private genHashByWorker (file: File): Promise<string> {
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
      worker.postMessage({ file })
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
  private async genHashByASM (file: File): Promise<string> {
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
            worker.postMessage({ file })
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
