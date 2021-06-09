import TableHelper from "./table"

interface TableColumn extends IDBIndexParameters {
  name: string
  key: string | string[]
}

export default class DBHelper {

  private req: IDBOpenDBRequest;
  private db: IDBDatabase;

  constructor (
    private dbName = "default-db",
    dbVersion = 1,
    cb = {
      onSuccess: (e_: Event) => {},
      onUpdate: (e: Event) => {},
      onError: (_: Event) => {}
    }
  ) {
    if (!window.indexedDB) {
      throw "browser don't support indexedDB"
    }
    this.req = window.indexedDB.open(this.dbName, dbVersion)
    this.req.onerror = (e: Event) => {
      cb.onError(e)
    }
    this.req.onsuccess = (e: Event) => {
      this.db = this.req.result
      cb.onSuccess(e)
    }
    this.req.onupgradeneeded = (e: Event) => {
      cb.onUpdate(e)
    }
  }

  createTable<Row> (name: string, columns: TableColumn[], opts?: IDBObjectStoreParameters) {
    if (!this.db.objectStoreNames.contains(name)) {
      const objectStore = this.db.createObjectStore(name, opts)
      columns.forEach((column) => objectStore.createIndex(column.name, column.key, column))
    }
    return this.getTable<Row>(name)
  }

  getTable<Row> (tableName: string) {
    return new TableHelper<Row>(tableName, this.db)
  }
}
