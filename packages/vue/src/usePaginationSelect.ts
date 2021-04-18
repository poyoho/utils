import { reactive, onMounted, watch, Ref } from "vue"
import { PaginationSelect, PaginationParams } from "@shared/services"

interface Data<State> {
  loading: boolean
  list: State[]
  total: number
}

export function usePaginationSelect<State>(
  data: Data<State>,
  query: PaginationParams,
  diffKey: keyof State,
  req: Ref<(query: PaginationParams) => Promise<unknown>>,
  opts?: {
    formatKeyList?: string;
    formatKeyTotal?: string;
  },
) {

  const service = new PaginationSelect<State>(diffKey, opts)
  const state = reactive({
    tableRef: null,
    isReq: true,
    isSelectAll: false,
    count: service.count(),
  })
  const cacheReq = req.value

  onMounted(() => {
    service.onMounted(
      (state.tableRef as any).toggleRowSelection,
      (state.tableRef as any).clearSelection,
    )
  })

  // page change
  watch(() => data.list, () => {
    console.log("[pagination-select] data.list loaded")
    service.flushPageCache()
    service.changeDataList(data.list)
  })

  // loaded check cache checkbox
  watch(() => data.loading, () => {
    if(!data.loading) {
      console.log("[pagination-select] page loaded")
      service.checkbox()
    }
  })

  // filter conditions change
  watch(() => Object.assign({}, query), (next, prev) => {
    // not updated in page, limit and request of memory
    if (next.page === prev.page && next.limit === prev.limit && !state.isReq) {
      console.log("[pagination-select] query change and not updated in page, limit", prev, next);
      state.isReq = true
      req.value = cacheReq
    }
  })

  return {
    state,

    rows() {
      service.row()
    },

    selectChange(row: State[]) {
      console.log("[pagination-select] select change", row.length);
      service.selectChange(row)
      if (state.isSelectAll) {
        state.count = data.total
      } else {
        state.count = service.count()
      }
    },

    selectAll() {
      service.selectAll()
      state.count = data.total
      state.isSelectAll = true
    },

    selectCancel() {
      service.selectCancel()
      state.count = 0
      state.isSelectAll = false
    },

    toggleRequest() {
      state.isReq = !state.isReq
      console.log("[pagination-select] toggle request");
      if (state.isReq) {
        req.value = cacheReq
      } else {
        req.value = service.request.bind(service)
      }
    },
  }
}
