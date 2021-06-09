interface ActionResult {
  status: number
  event: Event
}

interface SelectResult<T> extends ActionResult {
  data: T
}

export default class TableHelper<Row> {
  constructor (
    private tableName: string,
    private db: IDBDatabase
  ) {}

  get (key: IDBValidKey | IDBKeyRange): Promise<SelectResult<Row>> {
    return new Promise((resolve, reject) => {
      let transaction = this.db.transaction([this.tableName])
      let objectStore = transaction.objectStore(this.tableName)
      let request = objectStore.get(key)

      request.onerror = (event: Event) => {
        reject({ status: 500, event })
      }

      request.onsuccess = (event: Event) => {
        if (request.result) {
          if (request.result.ex < Date.now()) {
            this.del(key)
            resolve({ status: 200, event, data: null })
          } else {
            resolve({ status: 200, event, data: request.result })
          }
        } else {
          resolve({ status: 200, event, data: null })
        }
      }
    })
  }

  getAll (): Promise<SelectResult<Row[]>> {
    return new Promise((reslove, reject) => {
      let objectStore = this.db.transaction(this.tableName).objectStore(this.tableName)
      let result: Row[] = []
      objectStore.openCursor().onsuccess = function (event: Event) {
        let cursor = (event.target as any).result
        if (cursor) {
          result.push(cursor.value)
          cursor.continue()
        } else {
          reslove({ status: 200, event, data: result })
        }
      }

      objectStore.openCursor().onerror = function (event: Event) {
        reject({ status: 500, event })
      }
    })
  }

  add (row: Row, ex: number): Promise<ActionResult> {
    return new Promise((reslove, reject) => {
      let request = this.db.transaction([this.tableName], 'readwrite')
        .objectStore(this.tableName)
        .add(Object.assign(row, ex ? { ex: Date.now() + ex } : {}))

      request.onsuccess = (event: Event) => {
        reslove({ status: 200, event })
      }

      request.onerror = (event:Event) => {
        reject({ status: 500, event })
      }
    })
  }

  update (row: Row): Promise<ActionResult> {
    return new Promise((reslove, reject) => {
      let request = this.db.transaction([this.tableName], 'readwrite')
        .objectStore(this.tableName)
        .put(row)

      request.onsuccess = (event: Event) => {
        reslove({ status: 200, event })
      }

      request.onerror = (event:Event) => {
        reject({ status: 500, event })
      }
    })
  }

  del (key: IDBValidKey | IDBKeyRange): Promise<ActionResult> {
    return new Promise((resolve, reject) => {
      let request = this.db.transaction([this.tableName], 'readwrite')
        .objectStore(this.tableName)
        .delete(key)

      request.onsuccess = (event: Event) => {
        resolve({ status: 200, event })
      }

      request.onerror = (event: Event) => {
        reject({ status: 500, event })
      }
    })
  }

  clear (): Promise<ActionResult> {
    return new Promise((resolve, reject) => {
      let request = this.db.transaction([this.tableName], 'readwrite')
        .objectStore(this.tableName)
        .clear()

      request.onsuccess = (event: Event) => {
        resolve({ status: 200, event })
      }

      request.onerror = (event:Event) => {
        reject({ status: 500, event })
      }
    })
  }
}
