import BaseCacher from "./base"
export { CacheStatus } from "./base"

export function LocalStorageHelper(preId: string, timeSign: string) {
  return new BaseCacher(
    {
      setItem: localStorage.setItem,
      getItem: localStorage.getItem,
      delItem: localStorage.removeItem,
      clearItem: localStorage.clear,
    },
    {
      preId,
      timeSign,
      ex: 1000 * 60 * 60 * 24 * 31
    }

  )
}

export function SessionStorageHelper(preId: string, timeSign: string) {
  return new BaseCacher(
    {
      setItem: sessionStorage.setItem,
      getItem: sessionStorage.getItem,
      delItem: sessionStorage.removeItem,
      clearItem: sessionStorage.clear,
    },
    {
      preId,
      timeSign,
      ex: 1000 * 60 * 60 * 24 * 31
    }
  )
}
