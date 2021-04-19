<template>
  <span>{{ select.state.count }}</span>
  <el-button :type="select.state.isReq ? 'primary' : 'success'" @click="select.toggleRequest">changeRequest</el-button>
  <el-button :disabled="select.state.isSelectAll" @click="select.selectAll">all</el-button>
  <el-button :disabled="!select.state.isSelectAll" @click="select.selectCancel">cancel</el-button>
  <el-input v-model="query.a" style="height: 60px;" />
  <el-table
    :ref="select.ref"
    v-loading="data.loading"
    style="height: 100%"
    :data="data.list"
    @selection-change="select.selectChange"
  >
    <el-table-column type="selection" :selectable="() => !select.state.isSelectAll" />
    <el-table-column label="a" prop="a" />
    <el-table-column label="b" prop="b" />
  </el-table>
  <el-pagination
    layout="prev, pager, next"
    :total="data.total"
    :page-size="query.limit"
    :current-page="query.page"
    @size-change="page.limit"
    @current-change="page.page"
  />
</template>
<script lang="ts">
import { defineComponent, ref } from "vue"
import { usePaginationSelect, usePaginationTable } from "@poyoho/shared-vue"
import { request, RetType, Query } from "../../../mock/requestData"

export default defineComponent({
  setup() {
    const _req = ref(request)
    const { data, query, page, req } = usePaginationTable<Query, RetType>(_req, {})
    const select = usePaginationSelect(data, query, "a", _req)

    req()

    return {
      data,
      query,
      page,

      select,
    }
  },
})
</script>
