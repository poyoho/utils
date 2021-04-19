export interface PaginationParams {
  page?: number
  limit?: number
}

export class PaginationSelect<State> {
  private isSelectAll = false
  private rows = new Map<any, State>()

  private dataList: State[] = []
  private oldRows: Record<number | string, State> = {}
  private diffKey: keyof State
  private toggleRowSelection: (el: State, check: boolean) => void
  private clearSelection: () => void
  private opts: {
    formatKeyList: string
    formatKeyTotal: string
  } = {
    formatKeyList: 'list',
    formatKeyTotal: 'total',
  }

  constructor (
    diffKey: keyof State,
    opts?: {
      formatKeyList?: string;
      formatKeyTotal?: string;
    }
  ) {
    this.diffKey = diffKey
    this.opts = Object.assign(this.opts, opts)
  }

  public onMounted (
    toggleRowSelection: (el: State, check: boolean) => void,
    clearSelection: () => void
  ) {
    this.toggleRowSelection = toggleRowSelection
    this.clearSelection = clearSelection
  }

  // check cache rows
  public checkbox () {
    const oldList = new Set(this.row().map(el => el[this.diffKey]))
    this.dataList.forEach(el => {
      if (oldList.has(el[this.diffKey]) || (this.isSelectAll)) {
        this.toggleRowSelection(el, true)
      }
    })
  }

  public flushPageCache () {
    this.oldRows = {}
  }

  private flushAllCache () {
    this.flushPageCache()
    this.rows.clear()
  }

  // change select
  public selectChange (row: State[]) {
    const newRows = row.reduce((prev, next) => {
      prev[next[this.diffKey] as any] = next
      return prev
    }, {})
    const newKeys = Object.keys(newRows)
    const oldKeys = Object.keys(this.oldRows)

    new Set(newKeys.concat(oldKeys)).forEach(k => {
      if (!newRows[k] && this.oldRows[k]) { // new × / old √
        this.rows.delete(k)
      } else if (newRows[k] && !this.oldRows[k]) { // new √ / old ×
        this.rows.set(k, newRows[k])
      }
    })
    this.oldRows = newRows
  }

  // select all
  public selectAll () {
    this.isSelectAll = true
    this.checkbox()
  }

  // cancel select
  public selectCancel () {
    this.isSelectAll = false
    this.flushAllCache()
    this.clearSelection()
  }

  // request of memory data
  public request (query: PaginationParams) {
    const rows = this.row()
    return Promise.resolve({
      [this.opts.formatKeyList]: rows.slice(
        (query.page! - 1) * query.limit!,
        (query.page! - 1) * query.limit! + query.limit!
      ),
      [this.opts.formatKeyTotal]: rows.length,
    })
  }

  // get rows
  public row () {
    return Array.from(this.rows.values())
  }

  // select count
  public count () {
    return this.rows.size
  }

  // change datalist
  public changeDataList (dataList: State[]) {
    this.dataList = dataList
  }
}
