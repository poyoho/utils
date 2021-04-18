import { PaginationParams } from '@shared/services'
import { useState, MutableRefObject, useRef, useMemo } from "react"

export function usePaginationTable<Query extends PaginationParams, State> (
  request: MutableRefObject<(query: Query) => Promise<any>>,
  opts?: {
    formatKeyList: string;
    formatKeyTotal: string;
  },
) {
  opts = Object.assign({
    formatKeyList: "list",
    formatKeyTotal: "total",
  }, opts)

  const [list, setList] = useState([] as State[])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)

  const [query, setQuery] = useState({
    page: 1,
    limit: 10
  } as Query)

  const req = () => {
    console.log("[pagination-table] req", query);
    setLoading(true)
    request.current(query as Query).then((res) => {
      setTotal(() => res[opts!.formatKeyTotal])
      setList(() => res[opts!.formatKeyList])
    }).finally(() => {
      setLoading(false)
    })
  }

  function page(page: number) {
    setQuery((prev) => ({
      ...prev,
      page: page
    }))
  }

  function limit(_:number, size: number) {
    setQuery((prev) => ({
      ...prev,
      limit: size
    }))
  }

  const firstUpdate = useRef(true)
  useMemo(() => {
    if(firstUpdate.current) {
      firstUpdate.current = false
      return
    }
    setQuery((query) => ({
      ...query,
      page: 1,
      limit: 10
    }))
  }, [request.current])

  useMemo(() => {
    req()
  }, [query])

  return {
    data: {
      list,
      total,
      loading,
    },
    query,
    setQuery,

    page: {
      page,
      limit,
    },

    req,
  }
}
