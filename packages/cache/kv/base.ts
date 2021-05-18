export enum CacheStatus {
  SUCCESS,
  FAILURE,
  OVERFLOW,
  TIMEOUT
}

export default class BaseCacher {
  constructor(
    private setItem: (key: string, val: string) => void,
    private getItem: (key: string) => string,
    private delItem: (key: string) => void,
    private clearItem: () => void,
    private preId: string,
    private timeSign: string,
    private ex = 1000 * 60 * 60 * 24 * 31,
  ) {}

  private key (key: string) {
    return this.preId + key
  }

  clear() {
    this.clearItem()
  }

  get (key: string) {
    let status = CacheStatus.SUCCESS
    key = this.key(key)
    let val = this.getItem(key)
    if (val) {
      const [time, _val] = val.split(this.timeSign)
      if (+time > new Date().getTime() || +time === 0) {
        val = _val
      } else {
        val = null
        status = CacheStatus.TIMEOUT
        this.delItem(key)
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
    time = new Date(time).getTime() || new Date().getTime() + this.ex
    try {
      this.setItem(key, time + this.timeSign + val);
    } catch(e) {
      status = CacheStatus.OVERFLOW;
    }
    return status
  }

  del (key: string) {
    let status = CacheStatus.SUCCESS
    key = this.key(key)
    this.delItem(key)
    return status
  }
}
