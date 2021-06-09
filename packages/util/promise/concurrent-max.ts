// Promise.all with control of concurrent connections
/**
 *
 * @param reqs promise list
 * @param max number of concurrent connections
 * @returns result of promise list
 */
export function PromiseAllWithMax(
  reqs: Array<() => Promise<unknown>>,
  max: number
) {
  return new Promise(resolve => {
    let idx = 0
    const result = []
    if(reqs.length <= 0) {
      resolve(result)
    }
    function next() {
      reqs[idx++]().then(r => {
        result.push(r)
      }).finally(() => {
        if(reqs.length === result.length) { // 避免idx++正在运行 结果未返回
          resolve(result)
        } else if(idx < reqs.length) {
          next()
        }
      })
    }
    Array(max).fill(1).forEach(() => next())
  })
}
