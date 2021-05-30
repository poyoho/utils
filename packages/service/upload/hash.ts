import { useWorker } from "@poyoho/shared-service/worker"
export type genHashType = "worker" | "wasm"

type StateCallback = (hash: string) => void;


export function useFileHashCalculator(
  cb: (percent: number) => void = () => {},
  FILE_OFFSET = 50 * 1024 * 1024, // 50M
  CHUNK_OFFSET = 10 * 1024 * 1024, // 5M
  CALC_CHUNK = 1024 * 1024, // 1M
) {
  let worker: Worker
  let eventCb: StateCallback = () => {}

  function _emit (state: string) {
    eventCb(state)
  }

  function subscribe (cb: StateCallback) {
    eventCb = cb
  }

  // worker string function
  function _worker() {
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

  function _callWorker (
    importScripts: string[],
    formatScript: (str: string) => string = (str) => str
  ) {
    return useWorker(
      importScripts,
      [
        formatScript(
          _worker.toString().replace("this.FILE_OFFSET", String(FILE_OFFSET))
            .replace("this.CHUNK_OFFSET", String(CHUNK_OFFSET))
            .replace("this.CALC_CHUNK", String(CALC_CHUNK))
        )
      ].join("\n")
    )
  }

  // gen hash by worker
  const genHashByWorker = (file: File): Promise<string> => {
    return new Promise(resolve => {
      const sparkSite = new URL("../third/spark-md5.min.js", import.meta.url)
      const _worker = _callWorker([
        `self.importScripts("${sparkSite}");\n`,
      ])
      worker = _worker
      subscribe((value) => {
        resolve(value)
      })
      worker.postMessage({ file })
      worker.onmessage = (e) => {
        if (e.data.percent === 100) {
          console.log(e.data.hash);
          resolve(e.data.hash)
        }
        cb(e.data.percent)
      }
    })
  }

  // by request idle callback
  const genHashByASM = (file: File): Promise<string> =>  {
    return new Promise(resolve => {
      const sparkSite = new URL("../third/wasm/hash/hash.js", import.meta.url)
      const wasmSite = new URL('../third/wasm/hash/hash_bg.wasm', import.meta.url)
      const _worker = _callWorker(
        [
          `self.importScripts("${sparkSite}");\n`,
          `wasm_bindgen("${wasmSite}").then(() => this.postMessage({ action: "init" }));\n`,
        ],
        (script) => script.replace("new this.SparkMD5.ArrayBuffer()", "wasm_bindgen.HashHelper.new()")
      )
      worker = _worker
      subscribe((value) => {
        resolve(value)
      })
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
            cb(e.data.percent)
            break
        }
      }
    })
  }

  return {
    async genHash (
      type: genHashType,
      file: File,
    ) {
      let hash: string
      switch(type) {
        case "worker":
          hash = await genHashByWorker(file)
        case "wasm":
          hash = await genHashByASM(file)
      }
      console.log("hash helper exit");
      return hash
    },
    stop () {
      // stop worker
      worker?.terminate()
      // promise return
      _emit("")
    }
  }
}
