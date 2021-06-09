export enum CacheStatus {
  SUCCESS,
  FAILURE,
  OVERFLOW,
  TIMEOUT
}

export default class BaseCacher {
  constructor(
    private api: {
      setItem: (key: string, val: string) => void,
      getItem: (key: string) => string,
      delItem: (key: string) => void,
      clearItem: () => void,
    },
    private opts: {
      preId: string
      timeSign: string
      ex: number
    } = {
      preId: "",
      timeSign: "-",
      ex: 1000 * 60 * 60 * 24 * 31
    }
  ) {}

  private key (key: string) {
    return this.opts.preId + key
  }

  clear() {
    this.api.clearItem()
  }

  get (key: string) {
    let status = CacheStatus.SUCCESS
    key = this.key(key)
    let val = this.api.getItem(key)
    if (val) {
      const [time, _val] = val.split(this.opts.timeSign)
      if (+time > new Date().getTime() || +time === 0) {
        val = _val
      } else {
        val = null
        status = CacheStatus.TIMEOUT
        this.api.delItem(key)
      }
    } else {
      val = null
      status = CacheStatus.FAILURE
    }
    return {
      status,
      val
    }
  }

  set (key: string, val: string, time?: number) {
    let status = CacheStatus.SUCCESS
    key = this.key(key)
    time = new Date(time).getTime() || new Date().getTime() + this.opts.ex
    try {
      this.api.setItem(key, time + this.opts.timeSign + val)
    } catch(e) {
      status = CacheStatus.OVERFLOW
    }
    return status
  }

  del (key: string) {
    const status = CacheStatus.SUCCESS
    key = this.key(key)
    this.api.delItem(key)
    return status
  }
}
