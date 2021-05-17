# 上传

## 上传大文件

- [x] 文件切片
- [x] 上传文件 - 上传切片 / 合并文件
- [x] 请求【并发/重试】控制
- [ ] 慢启动优化(根据网速计算切片size)
- [x] 文件hash - none
- [x] 文件hash - worker
- [x] 文件hash - webasm
- [x] 文件秒传
- [x] 断点续传

## 前言

上传大文件主要做的工作是`文件切片`，充分利用网络资源。
* 大文件由于切片过多，过多的HTTP链接与会使浏览器卡顿，通过`控制异步请求的并发数`来解决。
* 在处理`文件切片大小`问题应该根据当前网络环境进行动态分配`SIZE`。
比如A用户网速为`1000MB`如果`SIZE=10MB`该用户每个请求都是马上完成的，则多次建立连接的资源衰耗也特别大，通过参照`tcp慢启动策略`对`SIZE`进行动态更新来解决。

`文件内容hash`实现对文件秒传、断点续传，可以快速定位文件上传状态。
* `文件hash`计算需要特比资源进行运算，通过`requestIdleCallback` / `web worker` / `WebAssembly` 进行算法优化。
* `断点续传`使用`xhr.abort()`会清空js的调用栈。

## 使用

1. 封装请求方法使用进度条 `onProgress` 和 保存每一个请求用于取消请求。
```ts
export function request({
  url,
  method = "post",
  data,
  headers = {},
  requestList = [],
  onProgress = (_: ProgressEvent) => {},
}) {
  return new Promise(resolve => {
    const xhr = new XMLHttpRequest()
    requestList.push(xhr)
    xhr.upload.onprogress = onProgress
    xhr.open(method, url);
    Object.keys(headers).forEach(key =>
      xhr.setRequestHeader(key, headers[key])
    );
    xhr.send(data)
    xhr.onload = e => {
      resolve({
        data: e.target
      });
    };
  });
}
```

2. 继承`UploadLargeFile`类

实现`上传文件切片` 、 `合并文件切片` 、 `校验文件存在` 三个接口

* 上传文件切片

|param|detail|
|-----|------|
|chunk|文件切片|
|hash|文件切片hash（简单区分切片文件）|
|index|分片顺序|
|filename|文件名|
|filehash|整个文件的hash|

* 合并文件切片

|param|detail|
|-----|------|
|size|分割文件尺寸|
|filename|文件名|
|filehash|整个文件的hash|

-* 校验文件存在

|param|detail|
|-----|------|
|filename|文件名|
|filehash|整个文件的hash|

需要返回两组数据

|returnData|detail|
|-----|------|
|shouldUpload|是否需要上传|
|uploadedList|已经上传列表|

```ts
class UploadService extends UploadLargeFile {
  constructor (private onProgress: (idx: number, e: ProgressEvent<EventTarget>) => void = () => {}) {
    super("worker", "http://localhost:3050/spark-md5.min.js")
  }

  public requestList = []

  uploadAPI (data: UploadParams) {
    const formData = new FormData()
    formData.append("chunk", data.chunk)
    formData.append("hash", data.hash)
    formData.append("index", data.index.toString())
    formData.append("filename", data.filename)
    formData.append("filehash", data.filehash)
    return request({
      url: "http://localhost:3000/upload",
      data: formData,
      requestList: this.requestList,
      onProgress: (e) => this.onProgress(data.index, e)
    })
  }

  mergeAPI (data: MergeParams) {
    return request({
      url: "http://localhost:3000/merge",
      headers: {
        "content-type": "application/json"
      },
      data: JSON.stringify(data)
    })
  }

  async verifyAPI (data: verifyUploadParamas) {
    const res = JSON.parse((await request({
      url: "http://localhost:3000/verify",
      headers: {
        "content-type": "application/json"
      },
      data: JSON.stringify(data)
    }) as any).data.response)
    return {
      shouldUpload: res.shouldUpload,
      uploadedList: res.uploadedList
    }
  }
}
```

3. 实例化`UploadLargeFile`服务

```ts
const uploadState = reactive({
  size: 0,
  percent: [] as percentState[],
  hashPercent: 0,
})
const uploadService = new UploadService((idx, e) => {
  uploadState.percent[idx].percent = parseInt(String((e.loaded / e.total) * 100))
})

uploadService.event.subscribe(state => {
  uploadState.hashPercent = Math.ceil(state.hashPercent)
  uploadState.percent = state.fileChunksDesc
})

return {
  uploadState,

  handleFileChange (e: { target: HTMLInputElement }) {
    uploadState.size = 0
    uploadState.percent = []
    const [file] = Array.from(e.target.files)
    if (!file) return
    uploadState.size = file.size
    uploadService.changeFile(file)
  },

  async handleUpload () {
    await uploadService.uploadFileChunk()
  },

  handleStop () {
    uploadService.requestList.forEach(xhr => xhr?.abort())
    uploadService.requestList = []
  },
}
```
