export function useWorker(importScripts: string[], workerScript: string): Worker {
  const workerData = new Blob(
    [
      ...importScripts,
      `(${workerScript})()`
    ],
    { type: "text/javascript" }
  )

  return new Worker(URL.createObjectURL(workerData))
}

export function useWASMWorker(importScripts: string[], workerScript: string, wasmSite: URL): Worker {
  const workerData = new Blob(
    [
      ...importScripts,
      `wasm_bindgen("${wasmSite}").then(() => this.postMessage({ action: "init" }));\n`,
      `(${workerScript})()`
    ],
    { type: "text/javascript" }
  )

  return new Worker(URL.createObjectURL(workerData))
}
