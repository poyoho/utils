# 比较

## 可比较列表

- [x] 使用`boolean`比较
- [x] 使用`key`比较

使用`boolean`进行比较
```js
this.selectRows = new diffListByBoolean<SelectableRow<State>>((a, b) => a > b)
```

使用`key`进行比较
```js
this.selectRows = new diffListByKey<SelectableRow<State>>(key)
```

## 统一api

```js
export abstract class diff<State> {
  abstract push(row: State): void // 增加
  abstract del(idx: index): void // 删除
  abstract value(): State[] // 获取列表
  abstract has(row: State | index): index | undefined // 是否存在
  abstract length(): number // 长度
  abstract clear(): void // 清空数组
  abstract equal(o: State, n: State): boolean // 属性相对判断
}
```
