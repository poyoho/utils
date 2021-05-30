import React, { useRef, useState, useMemo } from "react"
import { Table, Input, Button } from "antd"
import { request, RetType, Query, columns } from "../../../../mock/requestData"
import { usePaginationSelect, PaginationSelectState, SelectableRow } from "@poyoho/shared-service"

const Pagination: React.FC = () => {
  const selectService = useRef(usePaginationSelect<Query, RetType>(
    () => "a",
    (query: Query) => request(query),
    () => ({ list: "list", total: "total"})
  ))
  const [selectState, setSelectState] = useState<PaginationSelectState<SelectableRow<RetType>>>({
    selectCount: 0,
    pageSelectCount: 0,
    total: 0,
    list: [] as SelectableRow<RetType>[],
    selectAll: false,
  })

  selectService.current.event.subscribe(state => {
    console.log('state change', state);
    setSelectState(state)
  })

  const [state, setState] = useState({
    loading: false,
    useLocal: false,
  })

  const [query, setQuery] = useState<Query>({
    page: 1,
    limit: 10,
  })

  useMemo(() => {
    getList(state.useLocal)
  }, [query])

  async function getList(useLocal: boolean) {
    setState({...state, loading: true})
    await selectService.current.refresh(query, useLocal)
    setState({...state, loading: false})
  }

  async function toggleFetchData(useLocal?: boolean) {
    let tmp: boolean;
    if (typeof useLocal === 'undefined') {
      tmp = !state.useLocal
    } else {
      tmp = useLocal
    }
    setState({...state, loading: false, useLocal: tmp})
    setQuery({ ...query, page: 1})
  }

  function pageChange (page: number) {
    setQuery({ ...query, page})
  }

  function limitChange (size: number) {
    setQuery({ ...query, page: 1, limit: size})
  }

  function selectAll () {
    selectService.current.selectAll()
    if (state.useLocal) {
      setState({...state, useLocal: false})
      setQuery({ ...query })
    }
  }

  function selectCancel () {
    selectService.current.selectCancel()
    if (state.useLocal) {
      setState({...state, useLocal: false})
      setQuery({ ...query })
    }
  }

  return (
    <div>
      <span>{selectState.selectCount}</span>
      {
        state.useLocal
        ? <Button type="primary" onClick={() => toggleFetchData()}>查看所有</Button>
        : <Button type="default" onClick={() => toggleFetchData()}>查看选中</Button>
      }

      {
        ((selectState.pageSelectCount < selectState.list.length) || selectState.selectAll)
        ? <Button type="primary" onClick={() => selectService.current.togglePageSelect()}>全选本页</Button>
        : <Button type="default" onClick={() => selectService.current.togglePageSelect()}>反选本页</Button>
      }

      <Button disabled={selectState.selectAll} onClick={selectAll}>全选</Button>
      <Button disabled={!selectState.selectAll} onClick={selectCancel}>取消</Button>
      <Input placeholder="Basic usage" onPressEnter={(v) => setQuery((prev) => ({ ...prev, a: v.currentTarget.value }))} />
      <hr/>
      <Table
        rowKey="a"
        columns={columns}
        dataSource={selectState.list}
        loading={state.loading}
        rowSelection={{
          type: "checkbox",
          getCheckboxProps: () => ({ disabled: selectState.selectAll }),
          selectedRowKeys: selectState.list.filter(el => el.$selected).map(el => el.a),
          onSelect: (record, _, selectedRows) => {
            selectService.current.SelectMergeRow(selectedRows, record)
          },
          onSelectAll(_, rows) {
            selectService.current.SelectMergeRow(rows)
          }
        }}
        pagination={{
          total: selectState.total,
          current: query.page,
          pageSize: query.limit,
          onChange: pageChange,
          onShowSizeChange: limitChange,
        }}
      />
    </div>
  );
};

export default Pagination
