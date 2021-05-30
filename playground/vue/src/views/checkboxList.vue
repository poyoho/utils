<template>
  <span>{{ selectState.selectCount }}</span>
  <el-button v-if="state.useLocal" type="primary" @click="() => toggleFetchData()">查看所有</el-button>
  <el-button v-else type="success" @click="() => toggleFetchData()">查看选中</el-button>

  <el-button class="pagination-select-btn" @click="togglePageSelect" :disabled="selectState.selectAll" v-if="selectState.pageSelectCount < selectState.list.length || selectState.selectAll">
    本页全选
  </el-button>
  <el-button type="primary" @click="togglePageSelect" v-else>
    本页反选
  </el-button>

  <el-button :disabled="selectState.selectAll" @click="selectAll">全选</el-button>
  <el-button :disabled="!selectState.selectCount" @click="selectCancel">取消</el-button>
  <el-input v-model="query.a" style="height: 60px;" @change="toggleFetchData(false)"/>
  <el-table
    ref="tableRef"
    style="height: 100%"
    v-loading="state.loading"
    :data="selectState.list"
  >
    <el-table-column width="50px">
      <template #default="scope">
        <el-checkbox v-model="scope.row.$selected" :disabled="selectState.selectAll" @change="selectChange([], scope.row)"></el-checkbox>
      </template>
    </el-table-column>
    <el-table-column label="a" prop="a" />
    <el-table-column label="b" prop="b" />
  </el-table>
  <el-pagination
    layout="prev, pager, next"
    :total="selectState.total"
    :page-size="query.limit"
    :current-page="query.page"
    @size-change="getListForPageSizeChanged"
    @current-change="getListByPage"
  />
  <hr>
</template>
<script lang="ts">
import { defineComponent, reactive, ref } from "vue"
import { request, RetType, Query } from "../../../mock/requestData"
import { usePaginationSelect, PaginationSelectState, SelectableRow } from "@poyoho/shared-service/pagination-select"


export default defineComponent({
  setup() {
    const tableRef = ref()

    const selectState = ref<PaginationSelectState<SelectableRow<RetType>>>({
      selectCount: 0,
      pageSelectCount: 0,
      total: 0,
      list: [] as SelectableRow<RetType>[],
      selectAll: false,
    })

    const query = reactive<Query>({
      page: 1,
      limit: 10,
    })

    const state = reactive({
      loading: false,
      useLocal: false,
    })

    const selectService = usePaginationSelect<Query, RetType>(
      () => "a",
      (query: Query) => request(query),
      () => ({ list: "list", total: "total"})
    )

    selectService.event.subscribe(state => {
      selectState.value = state
    })

    async function getList(useLocal: boolean) {
      state.loading = true
      await selectService.refresh(query, useLocal)
      state.loading = false
    }
    getList(state.useLocal)

    return {
      state,
      query,
      tableRef,
      selectState,

      async toggleFetchData(useLocal?: boolean) {
        let tmp;
        if (typeof useLocal === 'undefined') {
          tmp = !state.useLocal
        } else {
          tmp = useLocal
        }
        query.page = 1
        await getList(tmp)
        state.useLocal = tmp
      },
      getListByPage (page: number) {
        query.page = page
        getList(state.useLocal)
      },

      getListForPageSizeChanged (size: number) {
        query.page = 1
        query.limit = size
        getList(state.useLocal)
      },

      selectChange (rows: RetType[], currentRow: RetType) {
        selectService.SelectMergeRow(rows, currentRow)
      },

      selectAll () {
        selectService.selectAll()
        if (state.useLocal) {
          state.useLocal = false
          getList(state.useLocal)
        }
      },
      selectCancel () {
        selectService.selectCancel()
        if (state.useLocal) {
          state.useLocal = false
          getList(state.useLocal)
        }
      },
      togglePageSelect () {
        selectService.togglePageSelect()
      }
    }
  },
})
</script>
