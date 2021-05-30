import { Subject } from 'rxjs'
import { diffListByBoolean, diffListByKey, diff, FunctionEqual } from "@poyoho/shared-util/diff"
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

type equalFn<State> = (o?: State, n?: State) => boolean | string | number
type fetchFn<QueryParams> = (query: QueryParams) => Promise<Record<string, any>>
type fetchDataKeyFn = () => { list: string, total: string }

export function usePaginationSelect<QueryParams extends PaginationParams, State>(
  // diff row
  equal: equalFn<State>,
  // request data
  fetchData: fetchFn<QueryParams>,
  // use fetch data return key
  useFetchDataKey: fetchDataKeyFn
) {
  let noRefreshed = false
  let selectRows: diff<SelectableRow<State>>

  const state = {
    selectCount: 0,
    selectAll: false,
    list: [] as SelectableRow<State>[],
    pageSelectCount: 0,
    total: 0,
  } as PaginationSelectState<SelectableRow<State>>
  const event = new Subject<PaginationSelectState<SelectableRow<State>>>()

  const cache = {
    rows: [] as SelectableRow<State>[], // cache rows when request of local data
    useLocal: false,
  }

  try {
    const key = equal() as string | number
    selectRows = new diffListByKey<SelectableRow<State>>(key)
  } catch (e) {
    selectRows = new diffListByBoolean<SelectableRow<State>>(equal as FunctionEqual<State>)
  }

  const _requestData = async (params: QueryParams, useLocal: boolean) => {
    if (cache.useLocal !== useLocal) {
      if (useLocal && !state.selectAll) {
        cache.rows = selectRows.value()
      } else {
        cache.rows = []
      }
      cache.useLocal = useLocal
    }
    if (useLocal && !state.selectAll) {
      return _localData(params)
    } else {
      return fetchData(params).then(res => {
        const key = useFetchDataKey()
        return {
          total: res[key.total],
          list: res[key.list]
        }
      })
    }
  }

  const _localData = (query: QueryParams): Promise<Record<string, any>> => {
    const startIndex = (query.page - 1) * query.limit
    return  Promise.resolve({
      list: cache.rows.slice(startIndex, startIndex + query.limit),
      total: cache.rows.length,
    })
  }

  // get rows
  const selectData = () => {
    return selectRows.value()
  }

  const refresh = async (params: QueryParams, useLocal: boolean) => {
    await _requestData(params, useLocal).then(res => {
      state.pageSelectCount = 0
      noRefreshed = true
      state.list = res.list
      state.total = res.total
      // dafa format
      state.list.forEach(el => {
        el.$selected = state.selectAll ? true : (selectRows.has(el) !== undefined)
        if (el.$selected) state.pageSelectCount++
      })
      event.next({
        ...state,
        selectCount: state.selectAll ? state.total : selectRows.length(),
      })
    })
  }

  // select row merge to row
  const SelectMergeRow = (userSelectRows: State[], currentRow?: any) => {
    let done = false
    if(state.selectAll) {
      return
    }
    if (currentRow) { // select one
      done = true
      const idx = selectRows.has(currentRow as SelectableRow<State>)
      // const ele = state.list.find(el => selectRows.equal(el, currentRow))!
      if (idx !== undefined) {
        currentRow.$selected = false
        selectRows.del(idx)
        state.pageSelectCount--
      } else {
        currentRow.$selected = true
        selectRows.push(currentRow)
        state.pageSelectCount++
      }
    } else {
      if (userSelectRows.length === state.list.length) { // select all
        done = true
        state.pageSelectCount = state.list.length
        state.list.forEach(row => {
          row.$selected = true
          const idx = selectRows.has(row)
          if (idx === undefined) {
            selectRows.push(row)
          }
        })
        state.selectCount = state.list.length
      } else if (userSelectRows.length === 0 && !noRefreshed) { // select cancel
        done = true
        state.pageSelectCount = 0
        state.list.forEach(row => {
          row.$selected = false
          const idx = selectRows.has(row)
          if (idx !== undefined) {
            selectRows.del(idx)
          }
        })
      }
    }
    noRefreshed = false
    if (done) {
      // console.log('SelectMergeRow', rows, selectRows, currentRow)
      event.next({
        ...state,
        selectCount: state.selectAll ? state.total : selectRows.length(),
      })
    }
  }

  // select all
  const selectAll = () => {
    selectRows.clear()
    state.selectAll = true
    noRefreshed = false
    event.next({
      ...state,
      list: state.list.map(ele => (ele.$selected = true) && ele),
      selectCount: state.total,
    })
  }

  // select cancel
  const selectCancel = () => {
    selectRows.clear()
    state.selectAll = false
    noRefreshed = false
    state.pageSelectCount = 0
    event.next({
      ...state,
      list: state.list.map(ele => (ele.$selected = false) || ele),
      selectCount: 0
    })
  }

    // select page all / cancel
  const togglePageSelect = (check?: boolean) => {
    noRefreshed = false
    if (
      (typeof check !== 'undefined' && check) ||
      (state.pageSelectCount !== state.list.length)
    ) {
      SelectMergeRow(state.list)
    } else {
      SelectMergeRow([])
    }
    // console.log(selectRows);
  }

  return {
    event,

    selectData,
    refresh,
    SelectMergeRow,
    selectAll,
    selectCancel,
    togglePageSelect,
  }
}
