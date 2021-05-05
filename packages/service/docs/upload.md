# 上传

## 上传大文件

- [x] 文件切片
- [x] 上传文件 - 上传切片 / 合并文件
- [x] 文件秒传
- [x] 断点续传
- [ ] 请求【并发/重试】控制
- [x] 文件hash - none
- [x] 文件hash - worker
- [ ] 文件hash - webasm
- [ ] 慢启动优化(根据网速计算切片size)


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
