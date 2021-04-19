import { reactive, watch, Ref, ref } from 'vue'
import { PaginationSelect, PaginationParams } from '@poyoho/shared-service'

interface Data<State> {
  loading: boolean
  list: State[]
  total: number
}

export function usePaginationSelect<State> (
  data: Data<State>,
  query: PaginationParams,
  diffKey: keyof State,
  req: Ref<(query: PaginationParams) => Promise<unknown>>,
  opts?: {
    formatKeyList?: string;
    formatKeyTotal?: string;
  }
) {
  const service = new PaginationSelect<State>(diffKey, opts)
  const tableRef = ref()
  const state = reactive({
    isReq: true,
    isSelectAll: false,
    count: service.count(),
  })
  const cacheReq = req.value

  watch(() => tableRef.value, () => {
    if (tableRef.value) {
      console.log('[pagination-select] table-ref mounted')
      service.onMounted(
        tableRef.value.toggleRowSelection,
        tableRef.value.clearSelection
      )
    }
  })

  // loaded check cache checkbox
  watch([() => data.loading, () => data.list], ([nextLoad, nextList], prev) => {
    if (!nextLoad && nextList) { // data loaded
      console.log('[pagination-select] page loaded', nextList)
      service.changeDataList(nextList as State[])
      service.checkbox()
    }
    service.flushPageCache()
  })

  // filter conditions change
  watch(() => Object.assign({}, query), (next, prev) => {
    // not updated in page, limit and request of memory
    if (next.page === prev.page && next.limit === prev.limit && !state.isReq) {
      console.log('[pagination-select] query change and not updated in page, limit', prev, next)
      state.isReq = true
      req.value = cacheReq
    }
  })

  return {
    state,

    ref: tableRef,

    rows () {
      return service.row()
    },

    selectChange (row: State[]) {
      if (!data.loading) {
        console.log('[pagination-select] select change', row.length)
        service.selectChange(row)
      }
      if (state.isSelectAll) {
        state.count = data.total
      } else {
        state.count = service.count()
      }
    },

    selectAll () {
      service.selectAll()
      state.count = data.total
      state.isSelectAll = true
      state.isReq = true
      req.value = cacheReq
    },

    selectCancel () {
      service.selectCancel()
      state.count = 0
      state.isSelectAll = false
    },

    toggleRequest () {
      console.log('[pagination-select] toggle request')
      state.isReq = !state.isReq
      if (state.isReq) {
        req.value = cacheReq
      } else {
        req.value = service.request.bind(service)
      }
    },
  }
}
