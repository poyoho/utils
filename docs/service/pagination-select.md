# 跨页选择器

* [服务](https://github.com/poyoho/shared/tree/master/packages/service/pagination-select)
* [vue用例](https://github.com/poyoho/shared/blob/master/playground/vue/src/views/pagination.vue)

## 跨页选择

初始化选择器，`selectCount`表示当页选中数量，`selectAll`表示是否跨页全选，`list/total`表示列表返回数据。维护的选中列表为一个`Set`，并且对展示列表中的每一个元素添加`$selected`标识标记该项目是否被选中。

```ts
const selectRows = []
const state = {
  selectCount: 0,
  selectAll: false,
  list: [],
  total: 0,
  pageSelectCount: 0,
}
```
当发生勾选变化时，将勾选内容合并到跨页选择器中。

在合并勾选的时候，只会发生三种情况【勾选一个、勾选所有、取消所有勾选】。在页面刷新的时候会上传一个空的selectRows，这个情况应该忽略，用`noRefreshed`标识是否第一次刷新。

> * `SelectMergeRow` 第一个参数表示现在勾选项，仅当全选和反选有效。【全选、取消全选】
> * `SelectMergeRow` 第二个参数点击勾选的一项，当此项存在会忽略第一个参数。【勾选一个】

```ts
function SelectMergeRow (selectRows: State[], currentRow?: any) {
  let done = false
  if(state.selectAll) {
    return
  }
  if (currentRow) { // 勾选一个
    done = true
    const idx = selectRows.has(currentRow as SelectableRow<State>)
    if (idx !== undefined) {
      currentRow.$selected = false
      selectRows.del(idx)
      state.pageSelectCount--
    } else {
      currentRow.$selected = true
      selectRows.push(currentRow)
      state.pageSelectCount++
    }
  } else {
    if (selectRows.length === state.list.length) { // 勾选所有
      done = true
      state.pageSelectCount = state.list.length
      state.list.forEach(row => {
        row.$selected = true
        const idx = selectRows.has(row)
        if (idx === undefined) {
          selectRows.push(row)
        }
      })
      state.selectCount = state.list.length
    } else if (selectRows.length === 0 && !this.noRefreshed) { // 取消勾选
      done = true
      state.pageSelectCount = 0
      state.list.forEach(row => {
        row.$selected = false
        const idx = selectRows.has(row)
        if (idx !== undefined) {
          selectRows.del(idx)
        }
      })
    }
  }
  this.noRefreshed = false
  if (done) {
    this.event.next({
      ...state,
      selectCount: state.selectAll ? state.total : selectRows.length(),
    })
  }
}
```

每次发生勾选变化都将变化合并到选择器中，外层调用者可以根据`state.list`下的元素展示勾选状态。

【情况1】使用组件提供的勾选方法更新勾选状态。

```ts
selectService.event.subscribe(state => {
  selectState.value = state
  nextTick(() => {
    selectState.value.list.forEach(row => tableRef.value?.toggleRowSelection(row, row.$selected))
  })
})
```

【情况2】直接使用`服务`的`$selected`状态。

```ts
selectService.event.subscribe(state => {
  selectState.value = state
})
```

## 查看已选择

更改请求数据方法，将勾选的数据按照列表数据格式输出给列表展示。

```ts
const cache = {
  rows: []
  useLocal: false,
}

function localData (query: QueryParams): Promise<Record<string, any>> {
  const startIndex = (query.page - 1) * query.limit
  return  Promise.resolve({
    list: cache.rows.slice(startIndex, startIndex + query.limit),
    total: cache.rows.length,
  })
}
```

使用`requestData`方法，代理发请求。在切换到本地数据的时候发生勾选行为额外拷贝一份数据，防止在切换分页刷新的时候取消勾选一项就少显示一项。

```ts
async function requestData (params: QueryParams, useLocal: boolean) {
  if (cache.useLocal !== useLocal) {
    if (useLocal && !state.selectAll) {
      cache.rows = selectRows.value()
    } else {
      cache.rows = []
    }
    cache.useLocal = useLocal
  }
  if (useLocal && !state.selectAll) {
    return localData(params)
  } else {
    return fetchData(params).then(res => {
      const key = useFetchDataKey()
      return {
        total: res[key.total],
        list: res[key.list]
      }
    })
  }
}
```

## 提供操作

对选项进行批量操作的时候不可以直接操作返回的`state`，在下次更新的时候服务的`state`会覆盖视图的`state`。在`模板`实现以下方法需同时调用`服务`的方法，使`服务`与`模板`数据同步。


服务内提供以下操作。

- 全选 => `selectAll`
- 反选 => `selectCancel`
- 页全选 => `togglePageSelect(?true)`
- 页反选 => `togglePageSelect(?false)`

### 全选

清空所有保存的选中项，设置当前为全选，设置选中数量为列表总数。

```ts
function selectAll () {
  selectRows.clear()
  state.selectAll = true
  noRefreshed = false
  event.next({
    ...state,
    list: state.list.map(ele => (ele.$selected = true) && ele),
    selectCount: state.total,
  })
}
```

### 反选

清空所有保存的选中项，设置当前为反选。

```ts
function selectCancel () {
  selectRows.clear()
  state.selectAll = false
  noRefreshed = false
  state.pageSelectCount = 0
  event.next({
    ...state,
    list: state.list.map(ele => (ele.$selected = false) || ele),
    selectCount: 0
  })
}
```

### 页全选/反选

页全选/反选，合并到页选择内容到选择器。

```ts
function togglePageSelect (check?: boolean) {
  this.noRefreshed = false
  if (
    (typeof check !== 'undefined' && check) ||
    (this.state.pageSelectCount !== this.state.list.length)
  ) {
    this.SelectMergeRow(this.state.list)
  } else {
    this.SelectMergeRow([])
  }
}
```
