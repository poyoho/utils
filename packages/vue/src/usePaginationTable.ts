import { PaginationParams } from '@shared/services'
import { reactive, Ref, watch } from "vue"

export function usePaginationTable<Query extends PaginationParams> (
  request: Ref<(query: Query) => Promise<any>>,
  opts?: {
    formatKeyList: string;
    formatKeyTotal: string;
  },
) {
  opts = Object.assign({
    formatKeyList: "list",
    formatKeyTotal: "total",
  }, opts)

  const data = reactive({
    list: [],
    total: 0,
    loading: false,
  })

  const query = reactive<Query>({
    page: 1,
    limit: 10,
  } as Query)

  function req () {
    console.log("[pagination-table] req", query)
    data.loading = true
    request.value(query as Query).then((res) => {
      data.list = res[opts!.formatKeyList]
      data.total = res[opts!.formatKeyTotal]
    }).finally(() => {
      data.loading = false
    })
  }

  function handleChange(page: number) {
    query.page = page
    req()
  }

  watch(() => request.value, () => {
    query.page = 1
    req()
  })

  return {
    data,
    query,

    handleChange,
    req,
  }
}
