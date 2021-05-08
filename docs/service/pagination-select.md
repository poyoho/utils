# 跨页选择

- [x] 跨页选择
- [x] 刷新保存勾选状态
- [x] 全选
- [x] 反选
- [x] 查看已选择
- [x] 页全选
- [x] 页反选

## 简介

* 单独维护一个`$selected`属性来判断该行是否已选。
* 使用`diffListByKey` / `diffListByBoolean` 来维护已经选择列表。

## 使用

1. 实现抽象方法。

```ts
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
```

2. 模板层获取`服务`更新状态。

【情况1】使用组件提供的`toggleRowSelection`勾选已经选中的数据。

```ts
selectService.event.subscribe(state => {
  selectState.value = state
  nextTick(() => {
    selectState.value.list.forEach(row => tableRef.value?.toggleRowSelection(row, row.$selected))
  })
})
```

【情况2】直接维护`checkbox`的`selected`状态，可以直接使用`服务`的`$selected`状态。

```ts
selectService.event.subscribe(state => {
  selectState.value = state
})
```

> 区别在于调用`SelectMergeRow`的时机。
> * `SelectMergeRow` 第一个参数表示现在勾选项，仅当全选和反选有效。
> * `SelectMergeRow` 第二个参数点击勾选的一项，当此项存在会忽略第一个参数。

3. ⚠ 注意

在`模板`实现以下方法需同时调用`服务`的方法，使`服务`与`模板`数据同步。
- 全选 => `selectAll`
- 反选 => `selectCancel`
- 查看已选择 => `refresh(query, ?true)`
- 页全选 => `togglePageSelect(?true)`
- 页反选 => `togglePageSelect(?false)`
