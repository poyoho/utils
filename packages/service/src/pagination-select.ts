import { Subject } from 'rxjs'

export interface PaginationParams {
  page: number
  limit: number
}

export interface PaginationSelectState<State> {
  selectAll: boolean
  selectCount: number
  pageSelectCount: number

  list: State[]
  total: number
}

export type SelectableRow<State> = State & { $selected: boolean }

export abstract class PaginationSelect<QueryParams extends PaginationParams, State> {
  private state = {
    selectCount: 0,
    selectAll: false,
    list: [] as SelectableRow<State>[],
    pageSelectCount: 0,
    total: 0,
  } as PaginationSelectState<SelectableRow<State>>
  private rows: SelectableRow<State>[] = []
  private noRefreshed = false

  private cache = {
    rows: [] as SelectableRow<State>[], // cache rows when request of local data
    useLocal: false,
    req: this.fetchData.bind(this)
  }

  public event = new Subject<PaginationSelectState<SelectableRow<State>>>()

  // diff row
  abstract equal (o: State, n: State): boolean
  // request data
  abstract fetchData (query: QueryParams): Promise<Record<string, any>>
  // use fetch data return key
  abstract useFetchDataKey (): { list: string, total: string }

  // get rows
  public selectData () {
    return this.rows.slice()
  }

  public async refresh (params: QueryParams, useLocal: boolean) {
    if (this.cache.useLocal !== useLocal) {
      if (useLocal && !this.state.selectAll) {
        if (this.cache.rows.length === 0) {
          this.cache.rows = this.rows.slice()
        }
        this.cache.req = this.localData.bind(this)
      } else {
        this.cache.rows = []
        this.cache.req = this.fetchData.bind(this)
      }
      this.cache.useLocal = useLocal
    }
    await this.requestData(params)
  }

  private localData (query: QueryParams): Promise<Record<string, any>> {
    const key = this.useFetchDataKey()
    return new Promise((resolve) => {
      const startIndex = (query.page - 1) * query.limit
      resolve({
        [key.list]: this.cache.rows.slice(startIndex, startIndex + query.limit),
        [key.total]: this.cache.rows.length,
      })
    })
  }

  private async requestData (params: QueryParams) {
    await this.cache.req(params).then(res => {
      const key = this.useFetchDataKey()
      this.state.pageSelectCount = 0
      this.state.selectCount = this.rows.length
      this.noRefreshed = true
      this.state.total = res[key.total]
      this.state.list = res[key.list]
      this.state.list.forEach(el => (el.$selected = this.state.selectAll ? true : !!(this.rows.find(row => this.equal(row, el)))))
      this.event.next({
        ...this.state,
        selectCount: this.state.selectAll ? this.state.total : this.rows.length,
      })
    })
  }

  // select row merge to row
  public SelectMergeRow (selectRows: State[], currentRow?: State) {
    let done = false
    if (currentRow) { // select one
      done = true
      const idx = this.rows.findIndex(el => this.equal(el, currentRow))
      const ele = this.state.list.find(el => this.equal(el, currentRow))!
      if (idx !== -1) {
        ele.$selected = false
        this.rows.splice(idx, 1)
        this.state.pageSelectCount--
      } else {
        ele.$selected = true
        this.rows.push(ele!)
        this.state.pageSelectCount++
      }
    } else {
      if (selectRows.length === this.state.list.length) { // select all
        done = true
        this.state.pageSelectCount = this.state.list.length
        this.state.list.forEach(row => {
          row.$selected = true
          const idx = this.rows.findIndex(el => this.equal(el, row))
          if (idx === -1) {
            this.rows.push(row)
          }
        })
        this.state.selectCount = this.state.list.length
      } else if (selectRows.length === 0 && !this.noRefreshed) { // select cancel
        done = true
        this.state.pageSelectCount = 0
        this.state.list.forEach(row => {
          row.$selected = false
          const idx = this.rows.findIndex(el => this.equal(el, row))
          if (idx !== -1) {
            this.rows.splice(idx, 1)
          }
        })
      }
    }
    this.noRefreshed = false
    if (done) {
      // console.log('SelectMergeRow', this.rows, selectRows, currentRow)
      this.event.next({
        ...this.state,
        selectCount: this.state.selectAll ? this.state.total : this.rows.length,
      })
    }
  }

  // select all
  public selectAll () {
    this.state.selectAll = true
    this.noRefreshed = false
    this.SelectMergeRow(this.state.list)
  }

  // select cancel
  public selectCancel () {
    this.rows = []
    this.noRefreshed = false
    this.state.selectAll = false
    this.SelectMergeRow([])
  }

  // select page all / cancel
  togglePageSelect (check?: boolean) {
    this.noRefreshed = false
    if (
      (typeof check !== 'undefined' && check) ||
      (this.state.pageSelectCount !== this.state.list.length)
    ) {
      this.state.pageSelectCount = this.state.list.length
      this.SelectMergeRow(this.state.list)
    } else {
      this.state.pageSelectCount = 0
      this.SelectMergeRow([])
    }
  }
}
