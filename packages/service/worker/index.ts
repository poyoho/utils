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
