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
    await this.requestData(params, useLocal).then(res => {
      this.state.pageSelectCount = 0
      this.noRefreshed = true
      this.state.list = res.list
      this.state.total = res.total
      // dafa format
      this.state.list.forEach(el => (el.$selected = this.state.selectAll ? true : !!(this.rows.find(row => this.equal(row, el)))))
      this.event.next({
        ...this.state,
        selectCount: this.state.selectAll ? this.state.total : this.rows.length,
      })
    })
  }

  private async requestData (params: QueryParams, useLocal: boolean) {
    if (this.cache.useLocal !== useLocal) {
      if (useLocal && !this.state.selectAll) {
        this.cache.rows = this.rows.slice()
      } else {
        this.cache.rows = []
      }
      this.cache.useLocal = useLocal
    }
    if (useLocal) {
      return this.localData(params)
    } else {
      return this.fetchData(params).then(res => {
        const key = this.useFetchDataKey()
        return {
          total: res[key.total],
          list: res[key.list]
        }
      })
    }
  }

  private localData (query: QueryParams): Promise<Record<string, any>> {
    const startIndex = (query.page - 1) * query.limit
    return  Promise.resolve({
      list: this.cache.rows.slice(startIndex, startIndex + query.limit),
      total: this.cache.rows.length,
    })
  }

  // select row merge to row
  public SelectMergeRow (selectRows: State[], currentRow?: State) {
    let done = false
    if(this.state.selectAll) {
      return
    }
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
    this.rows = []
    this.state.selectAll = true
    this.noRefreshed = false
    this.event.next({
      ...this.state,
      list: this.state.list.map(ele => (ele.$selected = true) && ele)
    })
  }

  // select cancel
  public selectCancel () {
    this.rows = []
    this.state.selectAll = false
    this.noRefreshed = false
    this.event.next({
      ...this.state,
      list: this.state.list.map(ele => (ele.$selected = false) || ele)
    })
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
