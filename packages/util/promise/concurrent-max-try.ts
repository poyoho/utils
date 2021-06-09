import { PromiseAllWithMax } from "./concurrent-max"

/**
 * Promise.all with control of concurrent connections and try times
 * @param fn promise
 * @param max number of concurrent connections
 * @param errorCount allow error count
 * @returns result of promise list
*/
export function PromiseTryAllWithMax(
  reqs: Array<() => Promise<unknown>>,
  max: number,
  errorCount: number
) {
  return new Promise((resolve, reject) => {
    const result = []
    if(reqs.length <= 0) {
      resolve(result)
    }
    function next(req: () => Promise<unknown>, currentMax=errorCount) {
      return () => req().then(r => {
        result.push(r)
      }).catch(e => {
        currentMax--
        if(currentMax === 0) {
          reject(e)
        } else {
          next(req, currentMax)
        }
      }).finally(() => {
        if(result.length === reqs.length) {
          resolve(result)
        }
      })
    }
    PromiseAllWithMax(
      reqs.map(req => next(req)),
      max
    )
  })
}
