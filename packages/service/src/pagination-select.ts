import { Subject } from 'rxjs'

export interface PaginationParams {
  page?: number
  limit?: number
}

export interface PaginationSelectState<State> {
  selectAll: boolean
  selectCount: number

  list: State[]
  total: number
}

export type SelectableRow<State> = State & { $selected: boolean }

export abstract class PaginationSelect<QueryParams, State> {
  private state = {
    selectCount: 0,
    selectAll: false,
    list: [] as SelectableRow<State>[],
    total: 0,
  } as PaginationSelectState<SelectableRow<State>>
  private pageSelectCount = 0
  private reflush = true // reflush page
  private rows: State[] = []
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
      el.$selected = !!(this.rows.find(row => this.equal(row, el)))
      return el
    })
  }

  public async refresh (params: QueryParams) {
    await this.req.value(params).then(res => {
      const key = this.useFetchDataKey()
      this.reflush = true
      this.pageSelectCount = 0
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
    this.event.next({
      ...this.state,
      selectAll: true,
      selectCount: this.state.total
    })
  }

  // cancel select
  public selectCancel () {
    this.rows = []
    this.event.next({
      ...this.state,
      selectAll: false,
      selectCount: 0
    })
  }

  // change select
  public selectChange (selectRows: State[], currentRow?: State) {
    if (currentRow) { // user check - single
      const idx = this.rows.findIndex(el => this.equal(el, currentRow))
      const ele = this.state.list.find(el => this.equal(el, currentRow))
      if (idx !== -1) {
        ele!.$selected = false
        this.rows.splice(idx, 1)
      } else {
        ele!.$selected = true
        this.rows.push(ele!)
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
      } else if (selectRows.length === 0 && !this.reflush) {
        this.state.list.forEach(row => {
          row.$selected = false
          const idx = this.rows.findIndex(el => this.equal(el, row))
          if (idx !== -1) {
            this.rows.splice(idx, 1)
          }
        })
        this.state.selectCount = 0
      }
    }
    this.reflush = false
    this.event.next({
      ...this.state,
      selectCount: this.rows.length,
    })
  }

  // toggle current page select
  togglePageSelect (check?: boolean) {
    if (
      (typeof check !== 'undefined' && check) ||
      (this.pageSelectCount !== this.state.list.length)
    ) {
      this.reflush = true
      this.selectChange(this.state.list)
    } else {
      this.selectChange([])
    }
  }
}
