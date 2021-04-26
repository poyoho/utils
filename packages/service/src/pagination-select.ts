import { Subject } from 'rxjs'

export interface PaginationParams {
  page?: number
  limit?: number
}

export interface PaginationSelectState<State> {
  selectAll: boolean
  selectCount: number
  pageSelectCount: number

  list: State[]
  total: number
}

export type SelectableRow<State> = State & { $selected: boolean }

export abstract class PaginationSelect<QueryParams, State> {
  private state = {
    selectCount: 0,
    selectAll: false,
    list: [] as SelectableRow<State>[],
    pageSelectCount: 0,
    total: 0,
  } as PaginationSelectState<SelectableRow<State>>
  private rows: State[] = []
  private refreshed = false
  private req = {
    value: this.fetchData
  }

  public event = new Subject<PaginationSelectState<SelectableRow<State>>>()

  // diff row
  abstract equal (o: State, n: State): boolean
  // request data
  abstract fetchData (query: QueryParams): Promise<Record<string, any>>
  // use fetch data return key
  abstract useFetchDataKey (): { list: string, total: string }

  private formatData (list: SelectableRow<State>[]) {
    return list.map(el => {
      el.$selected = this.state.selectAll ? true : !!(this.rows.find(row => this.equal(row, el)))
      return el
    })
  }

  public async refresh (params: QueryParams) {
    await this.req.value(params).then(res => {
      const key = this.useFetchDataKey()
      this.state.pageSelectCount = 0
      this.refreshed = true
      this.state.list = this.formatData(res[key.list])
      this.state.total = res[key.total]
    }).finally(() => {
      this.event.next({ ...this.state })
      console.log('refresh2', this.state)
    })
  }

  // get rows
  public selectData () {
    return Array.from(this.rows.values())
  }

  // select all
  public selectAll () {
    this.state.list = this.state.list.map(data => (data.$selected = true) && data)
    this.state.selectAll = true
    this.state.selectCount = this.state.total
    console.log('state', this.state)
    this.event.next({ ...this.state, })
  }

  // cancel select
  public selectCancel () {
    this.rows = []
    this.state.list = this.state.list.map(data => (data.$selected = false) || data)
    this.state.selectAll = false
    this.state.selectCount = 0
    this.event.next({ ...this.state })
  }

  // change select
  public selectChange (selectRows: State[], currentRow?: State) {
    // no select all
    if (currentRow) { // user check - single
      const idx = this.rows.findIndex(el => this.equal(el, currentRow))
      const ele = this.state.list.find(el => this.equal(el, currentRow))
      if (idx !== -1) {
        ele!.$selected = false
        this.rows.splice(idx, 1)
        this.state.pageSelectCount--
      } else {
        ele!.$selected = true
        this.rows.push(ele!)
        this.state.pageSelectCount++
      }
    } else { // auto - only work on [check all / check null]
      if (selectRows.length === this.state.list.length) {
        this.state.list.forEach(row => {
          row.$selected = true
          const idx = this.rows.findIndex(el => this.equal(el, row))
          if (idx === -1) {
            this.rows.push(row)
          }
        })
        this.state.selectCount = this.state.list.length
      } else if (selectRows.length === 0 && !this.refreshed) {
        this.state.list.forEach(row => {
          row.$selected = false
          const idx = this.rows.findIndex(el => this.equal(el, row))
          if (idx !== -1) {
            this.rows.splice(idx, 1)
          }
        })
      }
    }
    this.refreshed = false
    this.event.next({
      ...this.state,
      selectCount: this.state.selectAll ? this.state.total : this.rows.length,
    })
  }

  // toggle current page select
  togglePageSelect (check?: boolean) {
    if (
      (typeof check !== 'undefined' && check) ||
      (this.state.pageSelectCount !== this.state.list.length)
    ) {
      this.state.pageSelectCount = this.state.list.length
      this.state.list = this.state.list.map(data => (data.$selected = true) && data)
    } else {
      this.state.pageSelectCount = 0
      this.state.list = this.state.list.map(data => (data.$selected = false) || data)
    }
    this.event.next({ ...this.state })
  }
}
