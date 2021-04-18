import React, { useRef } from "react"
import { usePaginationTable, usePaginationSelect } from "@poyoho/shared-react"
import { Table, Input, Button } from "antd"
import { request, columns } from "../../../../mock/requestData"

interface Query {
  page: number
  limit: number
  a?: string
}

interface RetType {
  a: number
  b: number
}

const Pagination: React.FC = () => {
  let _req = useRef(request)
  const { data, query, setQuery, page, req } = usePaginationTable<Query, RetType>(_req)
  const selection = usePaginationSelect(data, query, "a", _req)

  return (
    <div>
      <span>{selection.state.count}</span>
      <Button
        type={selection.state.isReq ? 'primary' : 'default'}
        onClick={selection.toggleRequest}
      >changeRequest</Button>
      <Button disabled={selection.state.isSelectAll} onClick={selection.selectAll}>all</Button>
      <Button disabled={!selection.state.isSelectAll} onClick={selection.selectCancel}>cancel</Button>
      <Input placeholder="Basic usage"
        onPressEnter={(v) => {
          setQuery((prev) => ({ ...prev, a: v.currentTarget.value }))
        }}
      />
      <hr/>
      <Table
        rowKey="a"
        rowSelection={selection.rowSelection}
        columns={columns}
        dataSource={data.list}
        loading={data.loading}
        pagination={{
          total: data.total,
          current: query.page,
          pageSize: query.limit,
          onChange: page.page,
          onShowSizeChange: page.limit,
        }}
      />
    </div>
  );
};

export default Pagination
