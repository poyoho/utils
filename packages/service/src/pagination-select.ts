import { BehaviorSubject } from 'rxjs'

export interface PaginationParams {
  page?: number
  limit?: number
}

export interface PaginationSelectState<State> {
  selectAll: boolean
  selectCount: number

  list: State[]
  total: number
  loading: boolean
}

export type SelectableRow<State> = State & { $selected: boolean }

export abstract class PaginationSelect<State> {
  public state = new BehaviorSubject<PaginationSelectState<SelectableRow<State>>>({
    selectCount: 0,
    selectAll: false,
    list: [] as SelectableRow<State>[],
    total: 0,
    loading: false,
  })

  private pageSelectCount = 0
  private reflush = true // reflush page
  private rows: State[] = []

  // diff row
  abstract equal (o: State, n: State): boolean

  // get rows
  public selectData () {
    return Array.from(this.rows.values())
  }

  // select all
  public selectAll () {
    this.state.next({
      ...this.state.value,
      selectAll: true,
      selectCount: this.state.value.total
    })
  }

  // cancel select
  public selectCancel () {
    this.rows = []
    this.state.next({
      ...this.state.value,
      selectAll: false,
      selectCount: 0
    })
  }

  // change select
  public selectChange (items: State[], currentRow?: State) {
    if (currentRow) { // user check - single
      const idx = this.rows.findIndex(el => this.equal(el, currentRow))
      const ele = this.state.value.list.find(el => this.equal(el, currentRow))
      if (idx !== -1) {
        ele!.$selected = false
        this.rows.splice(idx, 1)
      } else {
        ele!.$selected = true
        this.rows.push(ele!)
      }
    } else { // auto - only work on [check all / check null]
      if (items.length === this.state.value.list.length) {
        this.state.value.list.forEach(row => {
          row.$selected = true
          const idx = this.rows.findIndex(el => this.equal(el, row))
          if (idx === -1) {
            this.rows.push(row)
          }
        })
        this.state.value.selectCount = this.state.value.list.length
      } else if (items.length === 0 && !this.reflush) {
        this.state.value.list.forEach(row => {
          row.$selected = false
          const idx = this.rows.findIndex(el => this.equal(el, row))
          if (idx !== -1) {
            this.rows.splice(idx, 1)
          }
        })
        this.state.value.selectCount = 0
      }
    }
    this.reflush = false
    this.state.next({
      ...this.state.value,
      selectCount: this.rows.length,
    })
  }

  // toggle current page select
  togglePageSelect (check?: boolean) {
    if (
      (typeof check !== 'undefined' && check) ||
      (this.pageSelectCount !== this.state.value.list.length)
    ) {
      this.reflush = true
      this.selectChange(this.state.value.list)
    } else {
      this.selectChange([])
    }
  }
}
