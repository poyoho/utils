<template>
  <div>
   <input type="file" @change="handleFileChange" />
   <el-button @click="handleUpload">上传</el-button>
  </div>
  <div>
    <div>总进度</div>
    <el-progress :percentage="uploadPercent"></el-progress>
  </div>
  <el-table :data="uploadState.percent" v-if="uploadPercent">
    <el-table-column label="name" align="center" prop="name"></el-table-column>
    <el-table-column label="大小(KB)" align="center" width="120">
      <template v-slot="{ row }">{{ transformByte(row.size) }}</template>
    </el-table-column>
    <el-table-column label="进度" align="center">
      <template v-slot="{ row }"><el-progress :percentage="row.percent"></el-progress></template>
    </el-table-column>
  </el-table>
</template>

<script lang="ts">
import { computed, defineComponent, reactive } from "vue"
import { UploadLargeFile, FileChunk, MergeParams } from "@poyoho/shared-service"

export function request({
  url,
  method = "post",
  data,
  headers = {},
  onProgress = (_: ProgressEvent) => {},
}) {
  return new Promise(resolve => {
    const xhr = new XMLHttpRequest()
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
  constructor (private onProgress: (idx: number, e: ProgressEvent<EventTarget>) => void) {
    super()
  }

  uploadAPI (data: FileChunk) {
    const formData = new FormData()
    formData.append("chunk", data.chunk)
    formData.append("hash", data.hash)
    formData.append("filename", data.filename)
    return request({
      url: "http://localhost:3000/upload",
      data: formData,
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
    })
    const uploadService = new UploadService((idx, e) => {
      uploadState.percent[idx].percent = parseInt(String((e.loaded / e.total) * 100))
    })

    uploadService.event.subscribe(state => {
      uploadState.percent = state.fileChunksDesc.map(fileChunkDesc => ({ ...fileChunkDesc, percent: 0 }))
    })

    function transformByte (val: number) {
      return Number((val / 1024 / 1024).toFixed(0))
    }

    const uploadPercent = computed(() => {
      if (!uploadState.percent.length) return 0
      const loaded = uploadState.percent
        .map(item => item.size * item.percent)
        .reduce((acc, cur) => acc + cur);
      return parseInt((loaded / uploadState.size).toFixed(2));
    })

    return {
      uploadState,
      uploadPercent,
      transformByte,

      handleFileChange (e: { target: HTMLInputElement }) {
        uploadState.size = 0
        uploadState.percent = []
        const [file] = Array.from(e.target.files)
        if (!file) return
        uploadState.size = file.size
        uploadService.changeFile(file)
      },

      async handleUpload () {
        uploadService.createFileChunk()
        await uploadService.uploadFileChunk()
      },
    }

  }
})
</script>
