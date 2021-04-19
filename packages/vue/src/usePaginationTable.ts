import { reactive, Ref, watch } from 'vue'

export interface PaginationParams {
  page?: number
  limit?: number
}

export function usePaginationTable<QueryParams, State> (
  req: Ref<(query: QueryParams) => Promise<unknown>>,
  q: QueryParams,
  opts?: {
    formatKeyList?: string,
    formatKeyTotal?: string
  }
) {
  const data = reactive({
    loading: false,
    total: 0,
    list: [] as State[],
  })

  const query = reactive(Object.assign({
    page: 1,
    limit: 10,
  }, q))

  opts = Object.assign({
    formatKeyList: 'list',
    formatKeyTotal: 'total'
  }, opts)

  function request () {
    data.loading = true
    req.value(query as QueryParams).then((res: any) => {
      console.log('[pagination-table] req', res.list)
      data.list = res[opts!.formatKeyList!]
      data.total = res[opts!.formatKeyTotal!]
    }).finally(() => {
      data.loading = false
    })
  }

  function getListByPage (page: number) {
    query.page = page
    request()
  }

  function getListForPageSizeChanged (size: number) {
    query.page = 1
    query.limit = size
    request()
  }

  watch(() => req.value, () => {
    console.log('[pagination-table] req change')
    query.page = 1
    request()
  })

  return {
    data,
    query,
    page: {
      page: getListByPage,
      limit: getListForPageSizeChanged,
    },
    req: request
  }
}
