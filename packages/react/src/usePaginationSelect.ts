import { useMemo, useRef, useState, MutableRefObject } from "react"
import { PaginationSelect, PaginationParams } from "@shared/services"

interface Data<State> {
  loading: boolean
  list: State[]
  total: number
}

export function usePaginationSelect<State> (
  data: Data<State>,
  query: PaginationParams,
  diffKey: keyof State,
  req: MutableRefObject<(query: PaginationParams) => Promise<unknown>>,
  opts?: {
    formatKeyList?: string;
    formatKeyTotal?: string;
  },
) {
  const service = useRef(new PaginationSelect<State>(diffKey, opts))
  let prevQuery = useRef(query)
  let cacheReq = useRef(req.current)

  const [isReq, setIsReq] = useState(true)
  const [isSelectAll, setIsSelectAll] = useState(false)
  const [count, setCount] = useState(0)
  const [selectedRowKeys, setSelectedRowKeys] = useState([] as any[])

  function toggleRowSelection (el: State) {
    setSelectedRowKeys((selectedRowKeys) => {
      console.log("[pagination-select] toggleRowSelection", selectedRowKeys);
      return selectedRowKeys.concat([el[diffKey]])
    })
  }

  function clearSelection () {
    setSelectedRowKeys(() => [])
  }

  service.current.onMounted(
    toggleRowSelection,
    clearSelection
  )

  // page change
  useMemo(() => {
    console.log("[pagination-select] page change", data.list);
    setSelectedRowKeys(() => [])
    service.current.changeDataList(data.list)
    service.current.flushPageCache()
  }, [data.list])

  // loaded check cache checkbox
  useMemo(() => {
    if(!data.loading) {
      console.log("[pagination-select] page load");
      service.current.checkbox()
    }
  }, [data.loading])

  // filter conditions change
  useMemo(() => {
    // not updated in page, limit and request of memory
    if (prevQuery.current.page === query.page && prevQuery.current.limit === query.limit && !isReq) {
      console.log("[pagination-select] query change and not updated in page, limit", query, prevQuery.current);
      setIsReq(true)
      req.current = cacheReq.current
    }
    prevQuery.current = query
  }, [query])


  return {
    state: {
      isReq,
      isSelectAll,
      count,
    },

    rowSelection: {
      type: "checkbox" as any,
      selectedRowKeys,
      onChange: (selectedRowKeys: React.Key[], selectedRows: State[]) => {
        console.log("[pagination-select] select change", selectedRowKeys, selectedRows);
        service.current.selectChange(selectedRows)
        setSelectedRowKeys(() => selectedRowKeys)
        if (isSelectAll) {
          setCount(data.total)
        } else {
          setCount(service.current.count())
        }
      },
      getCheckboxProps: () => ({ disabled: isSelectAll })
    },

    rows() {
      service.current.row()
    },

    selectAll() {
      service.current.selectAll()
      setCount(data.total)
      setIsSelectAll(true)
    },

    selectCancel() {
      service.current.selectCancel()
      setCount(0)
      setIsSelectAll(false)
    },

    toggleRequest() {
      if (!isReq) {
        req.current = cacheReq.current
      } else {
        req.current = service.current.request.bind(service.current)
      }
      setIsReq((state) => !state)
    },
  }
}
