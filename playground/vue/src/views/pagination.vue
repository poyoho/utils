<template>
  <span>{{ selectState.selectCount }}</span>
  <!-- <el-button :type="selectState.state.isReq ? 'primary' : 'success'" @click="selectState.toggleRequest">changeRequest</el-button> -->
  <!-- <el-button :disabled="selectState.selectAll" @click="selectState.selectAll">all</el-button>
  <el-button :disabled="!selectState.selectAll" @click="selectState.selectCancel">cancel</el-button>
  <el-input v-model="query.a" style="height: 60px;" /> -->
  <el-table
    :ref="tableRef"
    v-loading="data.loading"
    style="height: 100%"
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
import { defineComponent, reactive, ref } from "vue"
import { request, RetType } from "../../../mock/requestData"
import { PaginationSelect, PaginationSelectState, SelectableRow } from "@poyoho/shared-service"

class SelectedService extends PaginationSelect<RetType> {
  equal(o: RetType,n: RetType): boolean {
    return o.a === n.a
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

    const data = reactive({
      loading: false,
    })

    const selectService = new SelectedService()

    selectService.state.subscribe(state => {
      selectState.value = state
      selectState.value.list.forEach(row => tableRef.value?.toggleRowSelection(row, row.$selected))
    })

    function getList() {
      data.loading = true
      request(query).then((res) => {
        selectState.value.list = res.list as any
        selectState.value.total = res.total as any
      }).finally(() => {
        data.loading = false
      })
    }
    getList()
    return {
      data,
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
      }

    }
  },
})
</script>
