<template>
  <span>{{ selectState.selectCount }}</span>
  <!-- <el-button :type="selectState.state.isReq ? 'primary' : 'success'" @click="selectState.toggleRequest">changeRequest</el-button> -->
  <el-button :disabled="selectState.selectAll" @click="selectAll">all</el-button>
  <el-button :disabled="!selectState.selectAll" @click="selectCancel">cancel</el-button>
  <!-- <el-input v-model="query.a" style="height: 60px;" /> -->
  <el-table
    ref="tableRef"
    style="height: 100%"
    v-loading="state.loading"
    :data="selectState.list"
    @selection-change="selectChange"
    @select="selectChange"
  >
    <el-table-column type="selection" :selectable="() => !selectState.selectAll" />
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
</template>
<script lang="ts">
import { defineComponent, reactive, ref, nextTick } from "vue"
import { request, RetType, Query } from "../../../mock/requestData"
import { PaginationSelect, PaginationSelectState, SelectableRow } from "@poyoho/shared-service"

class SelectedService extends PaginationSelect<Query, RetType> {
  useFetchDataKey () {
    return {
      list: "list",
      total: "total"
    }
  }

  equal(o: RetType,n: RetType): boolean {
    return o.a === n.a
  }

  fetchData(query: Query): Promise<Record<string,any>> {
    return request(query)
  }
}


export default defineComponent({
  setup() {
    const tableRef = ref()
    const selectState = ref<PaginationSelectState<SelectableRow<RetType>>>({} as any)
    const query = reactive({
      page: 1,
      limit: 10,
    })

    const state = reactive({
      loading: false
    })

    const selectService = new SelectedService()

    selectService.event.subscribe(state => {
      console.log('state change', state)
      selectState.value = state
      nextTick(() => {
        selectState.value.list.forEach(row => tableRef.value?.toggleRowSelection(row, row.$selected))
      })
    })

    async function getList() {
      state.loading = true
      await selectService.refresh(query)
      state.loading = false
    }
    getList()

    return {
      state,
      query,
      tableRef,
      selectState,

      getListByPage (page: number) {
        query.page = page
        getList()
      },

      getListForPageSizeChanged (size: number) {
        query.page = 1
        query.limit = size
        getList()
      },

      selectChange (rows: RetType[], currentRow: RetType) {
        selectService.selectChange(rows, currentRow)
      },

      selectAll () {
        selectService.selectAll()
      },
      selectCancel () {
        selectService.selectCancel()
      },

    }
  },
})
</script>
