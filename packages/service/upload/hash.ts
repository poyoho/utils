export type genHashType = "worker" | "wasm"

export class HashHelper {
  constructor(
    private cb: (percent: number) => void = () => {},
    private FILE_OFFSET = 50 * 1024 * 1024, // 50M
    private CHUNK_OFFSET = 10 * 1024 * 1024, // 5M
    private CALC_CHUNK = 1024 * 1024, // 1M
  ) {}

  private worker: Worker

  public genHash (
    type: genHashType,
    file: File,
  ) {
    switch(type) {
      case "worker":
        return this.genHashByWorker(file)
      case "wasm":
        return this.genHashByASM(file)
    }
  }

  public stop () {
    this.worker?.terminate()
  }

  // worker string function
  private _worker (this: any) {
    // similar to the Bloom filter
    // take part of the data as a hash
    // MD5 is also vulnerable
    async function *bloomFilter(file: File): AsyncGenerator<{
      buff: Uint8Array,
      endPtr: number
    }> {
      const FILE_OFFSET = this.FILE_OFFSET
      const CHUNK_OFFSET = this.CHUNK_OFFSET
      const CALC_CHUNK = this.CALC_CHUNK

      let count = 0
      const chunkCount = Math.ceil(file.size / FILE_OFFSET)
      for (let cur = 0; cur < file.size; cur += FILE_OFFSET) {
        const endPtr = cur + FILE_OFFSET
        const fileChunk = file.slice(cur, endPtr)
        // first and end do not slice
        // other slice again
        if(![0, chunkCount - 1].includes(count)) {
          const chunks = []
          for (let samplingCur = cur; samplingCur < endPtr; samplingCur += CHUNK_OFFSET) {
            chunks.push(fileChunk.slice(samplingCur - cur, CALC_CHUNK))
          }
          yield { buff: new Uint8Array(await new Blob(chunks).arrayBuffer()), endPtr }
        } else {
          yield { buff: new Uint8Array(await fileChunk.arrayBuffer()), endPtr }
        }
        count++
      }
    }

    this.onmessage = async (e) => {
      const { file } = e.data
      const spark = new this.SparkMD5.ArrayBuffer();
      const fileChunksIteror = bloomFilter(file)
      while (true) {
        const fileChunk = await fileChunksIteror.next()
        if (fileChunk.done) { break }
        // console.time("chunk")
        const { buff, endPtr } = fileChunk.value
        spark.append(buff)
        // console.timeEnd("chunk")
        this.postMessage({
          action: "percent",
          percent: endPtr > file.size ? 99 : endPtr * 100 / file.size,
        })
      }
      this.postMessage({
        action: "percent",
        percent: 100,
        hash: spark.end()
      })
    }
  }

  private callWorker (
    importScripts: string[],
    formatScript: (str: string) => string = (str) => str
  ) {
    const workerScript = this._worker.toString().replace("this.FILE_OFFSET", String(this.FILE_OFFSET))
      .replace("this.CHUNK_OFFSET", String(this.CHUNK_OFFSET))
      .replace("this.CALC_CHUNK", String(this.CALC_CHUNK))

    const workerData = new Blob(
      [
        ...importScripts,
        formatScript(`(function ${workerScript})()`)
      ],
      { type: "text/javascript" }
    )

    return new Worker(URL.createObjectURL(workerData))
  }

  // gen hash by worker
  private genHashByWorker (file: File): Promise<string> {
    return new Promise(resolve => {
      const sparkSite = new URL("../third/spark-md5.min.js", import.meta.url)
      const worker = this.callWorker([
        `self.importScripts("${sparkSite}");\n`,
      ])
      this.worker = worker
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
    return new Promise(resolve => {
      const sparkSite = new URL("../third/wasm/hash/hash.js", import.meta.url)
      const wasmSite = new URL('../third/wasm/hash/hash_bg.wasm', import.meta.url)
      const worker = this.callWorker(
        [
          `self.importScripts("${sparkSite}");\n`,
          `wasm_bindgen("${wasmSite}").then(() => this.postMessage({ action: "init" }));\n`,
        ],
        (script) => script.replace("new this.SparkMD5.ArrayBuffer()", "wasm_bindgen.HashHelper.new()")
      )
      this.worker = worker
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
