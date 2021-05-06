<template>
  <div>
   <input type="file" @change="handleFileChange" />
   <el-button @click="handleUpload">上传</el-button>
   <el-button @click="handleStop">暂停</el-button>
   <el-button @click="handleUpload">恢复</el-button>
  </div>
  <el-progress :percentage="uploadState.hashPercent"></el-progress>
  <div class="cube-container" :style="{width:cubeWidth+'px'}">
    <div class="cube"
      v-for="chunk in uploadState.percent"
      :key="chunk.name">
      <div
        :class="{
        'uploading':chunk.percent>0&&chunk.percent<100,
        'uploaded':chunk.percent===100,
        'pass':chunk.percent===101,
        'success':chunk.percent===102,
        }"
        :style="{height:chunk.percent+'%'}"
        >
        <i v-if="chunk.percent>0&&chunk.percent<100" class="el-icon-loading" style="color:#F56C6C;"></i>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { computed, defineComponent, reactive } from "vue"
import { UploadLargeFile, UploadFileParams, FileMergeParams, verifyUploadFileParamas } from "@poyoho/shared-service"

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

class UploadService extends UploadLargeFile {
  constructor (private onProgress: (idx: number, e: ProgressEvent<EventTarget>) => void = () => {}) {
    super("worker")
  }

  public requestList = []

  uploadAPI (data: UploadFileParams) {
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

  mergeAPI (data: FileMergeParams) {
    return request({
      url: "http://localhost:3000/merge",
      headers: {
        "content-type": "application/json"
      },
      data: JSON.stringify(data)
    })
  }

  async verifyAPI (data: verifyUploadFileParamas) {
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

interface percentState {
  percent: number
  size: number
  name: string
}

export default defineComponent({
  setup() {
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

    const cubeWidth = computed(() => {
      return Math.ceil(Math.sqrt(uploadState.percent.length))*16
    })

    return {
      cubeWidth,
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

  }
})
</script>
<style scoped>
.cube-container {
  width: 100px;
  overflow: hidden;
}
.cube {
  width: 16px;
  height: 16px;
  line-height: 12px;
  border: 1px solid black;
  background:  #eee;
  float: left;
}
.cube>.uploading {
  background: #409EFF;
}

.cube>.uploaded {
  background: #3a97c2;
}

.cube>.success {
  background: #45c23a;
}

.cube>.pass {
  background: #666666;
}
</style>
