type index = string | number
export type FunctionEqual<State> = (o: State, n: State) => boolean

export abstract class diff<State> {
  abstract push(row: State): void
  abstract del(idx: index): void
  abstract value(): State[]
  abstract has(row: State | index): index | undefined
  abstract length(): number
  abstract clear(): void
  abstract equal(o: State, n: State): boolean
}

export class diffListByBoolean<State> extends diff<State> {
  private _data: Array<State>
  private _equal: FunctionEqual<State>
  constructor(equal: FunctionEqual<State>, init?: State[]) {
    super()
    this._data = init || []
    this._equal = equal
  }

  push(row: State) {
    this._data.push(row)
  }
  del(idx: index) {
    this._data.splice(idx as number, 1)
  }

  value() {
    return this._data.slice()
  }

  has(row: State) {
    const idx = this._data.findIndex(el => this._equal(el, row))
    if (idx === -1) {
      return undefined
    } else {
      return idx
    }
  }

  length() {
    return this._data.length
  }

  clear() {
    this._data = []
  }

  equal(o: State, n: State) {
    return this._equal(o, n)
  }
}

export type KeyEqual = string | number
export class diffListByKey<State> extends diff<State> {
  private _data: Map<KeyEqual, State>;
  private _key: KeyEqual
  constructor(key: KeyEqual, init?: Map<KeyEqual, State>) {
    super()
    this._data = init || new Map()
    this._key = key
  }

  push(row: State) {
    this._data.set(row[this._key], row)
  }

  del(idx: KeyEqual) {
    this._data.delete(idx as number)
  }

  value() {
    return Array.from(this._data.values())
  }

  has(row: State) {
    const k = row[this._key]
    if (this._data.has(k)) {
      return k
    } else {
      return undefined
    }
  }

  length() {
    return this._data.size
  }

  clear() {
    this._data.clear()
  }

  equal(o: State, n: State) {
    return o[this._key] === n[this._key]
  }
}
