import { Subject } from 'rxjs'
import { diffListByBoolean, diffListByKey, diff, FunctionEqual } from "./diff-list"
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
  private noRefreshed = false
  private selectRows: diff<SelectableRow<State>>
  private cache = {
    rows: [] as SelectableRow<State>[], // cache rows when request of local data
    useLocal: false,
  }

  public event = new Subject<PaginationSelectState<SelectableRow<State>>>()

  // diff row
  abstract equal (o?: State, n?: State): boolean | string | number
  // request data
  abstract fetchData (query: QueryParams): Promise<Record<string, any>>
  // use fetch data return key
  abstract useFetchDataKey (): { list: string, total: string }

  constructor () {
    try {
      const key = this.equal() as string | number
      this.selectRows = new diffListByKey<SelectableRow<State>>(key)
    } catch (e) {
      this.selectRows = new diffListByBoolean<SelectableRow<State>>(this.equal as FunctionEqual<State>)
    }
  }

  // get rows
  public selectData () {
    return this.selectRows.value()
  }

  public async refresh (params: QueryParams, useLocal: boolean) {
    await this.requestData(params, useLocal).then(res => {
      this.state.pageSelectCount = 0
      this.noRefreshed = true
      this.state.list = res.list
      this.state.total = res.total
      // dafa format
      this.state.list.forEach(el => {
        el.$selected = this.state.selectAll ? true : (this.selectRows.has(el) !== undefined)
        if (el.$selected) this.state.pageSelectCount++
      })
      this.event.next({
        ...this.state,
        selectCount: this.state.selectAll ? this.state.total : this.selectRows.length(),
      })
    })
  }

  private async requestData (params: QueryParams, useLocal: boolean) {
    if (this.cache.useLocal !== useLocal) {
      if (useLocal && !this.state.selectAll) {
        this.cache.rows = this.selectRows.value()
      } else {
        this.cache.rows = []
      }
      this.cache.useLocal = useLocal
    }
    if (useLocal && !this.state.selectAll) {
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
  public SelectMergeRow (selectRows: State[], currentRow?: any) {
    let done = false
    if(this.state.selectAll) {
      return
    }
    if (currentRow) { // select one
      done = true
      const idx = this.selectRows.has(currentRow as SelectableRow<State>)
      // const ele = this.state.list.find(el => this.selectRows.equal(el, currentRow))!
      if (idx !== undefined) {
        currentRow.$selected = false
        this.selectRows.del(idx)
        this.state.pageSelectCount--
      } else {
        currentRow.$selected = true
        this.selectRows.push(currentRow)
        this.state.pageSelectCount++
      }
    } else {
      if (selectRows.length === this.state.list.length) { // select all
        done = true
        this.state.pageSelectCount = this.state.list.length
        this.state.list.forEach(row => {
          row.$selected = true
          const idx = this.selectRows.has(row)
          if (idx === undefined) {
            this.selectRows.push(row)
          }
        })
        this.state.selectCount = this.state.list.length
      } else if (selectRows.length === 0 && !this.noRefreshed) { // select cancel
        done = true
        this.state.pageSelectCount = 0
        this.state.list.forEach(row => {
          row.$selected = false
          const idx = this.selectRows.has(row)
          if (idx !== undefined) {
            this.selectRows.del(idx)
          }
        })
      }
    }
    this.noRefreshed = false
    if (done) {
      // console.log('SelectMergeRow', this.rows, selectRows, currentRow)
      this.event.next({
        ...this.state,
        selectCount: this.state.selectAll ? this.state.total : this.selectRows.length(),
      })
    }
  }

  // select all
  public selectAll () {
    this.selectRows.clear()
    this.state.selectAll = true
    this.noRefreshed = false
    this.event.next({
      ...this.state,
      list: this.state.list.map(ele => (ele.$selected = true) && ele),
      selectCount: this.state.total,
    })
  }

  // select cancel
  public selectCancel () {
    this.selectRows.clear()
    this.state.selectAll = false
    this.noRefreshed = false
    this.state.pageSelectCount = 0
    this.event.next({
      ...this.state,
      list: this.state.list.map(ele => (ele.$selected = false) || ele),
      selectCount: 0
    })
  }

  // select page all / cancel
  togglePageSelect (check?: boolean) {
    this.noRefreshed = false
    if (
      (typeof check !== 'undefined' && check) ||
      (this.state.pageSelectCount !== this.state.list.length)
    ) {
      this.SelectMergeRow(this.state.list)
    } else {
      this.SelectMergeRow([])
    }
    // console.log(this.selectRows);
  }
}
