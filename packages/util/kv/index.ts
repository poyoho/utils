import BaseCacher from "./base"
export { CacheStatus } from "./base"

export function LocalStorageHelper(preId: string, timeSign: string) {
  return new BaseCacher(
    localStorage.setItem,
    localStorage.getItem,
    localStorage.removeItem,
    localStorage.clear,
    preId,
    timeSign
  )
}

export function SessionStorageHelper(preId: string, timeSign: string) {
  return new BaseCacher(
    sessionStorage.setItem,
    sessionStorage.getItem,
    sessionStorage.removeItem,
    sessionStorage.clear,
    preId,
    timeSign
  )
}
