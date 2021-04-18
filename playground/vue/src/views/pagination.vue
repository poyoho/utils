<template>
  <span>{{ selection.state.count }}</span>
  <el-button :type="selection.state.isReq ? 'primary' : 'success'" @click="selection.toggleRequest">changeRequest</el-button>
  <el-button :disabled="selection.state.isSelectAll" @click="selection.selectAll">all</el-button>
  <el-button :disabled="!selection.state.isSelectAll" @click="selection.selectCancel">cancel</el-button>
  <el-input v-model="query.a" style="height: 60px;" />
  <el-table
    :ref="(ref) => (selection.state.tableRef = ref)"
    v-loading="data.loading"
    style="height: 100%"
    :data="data.list"
    @selection-change="selection.selectChange"
  >
    <el-table-column type="selection" :selectable="() => !selection.state.isSelectAll" />
    <el-table-column label="a" prop="a" />
    <el-table-column label="b" prop="b" />
  </el-table>
  <el-pagination
    layout="prev, pager, next"
    :page-size="query.limit"
    :current-page="query.page"
    :total="data.total"
    @current-change="handleChange"
  />
</template>
<script lang="ts">
import { defineComponent, ref } from "vue"
import { usePaginationSelect, usePaginationTable } from "@poyoho/shared-vue"
import { request } from "../../../mock/requestData"

interface Query {
  page?: number
  limit?: number
  a?: string
}

export default defineComponent({
  setup() {
    const _req = ref(request)
    const { data, query, handleChange, req } = usePaginationTable<Query>(_req)
    const selection = usePaginationSelect(data, query, "a", _req)

    req()

    return {
      data,
      query,
      selection,
      handleChange,
    }
  },
})
</script>
