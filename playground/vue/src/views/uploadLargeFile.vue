<template>
  <div>
   <input type="file" @change="handleFileChange" />
   <el-button @click="handleUpload">上传</el-button>
   <el-button @click="handleStop">暂停</el-button>
   {{ uploadState.canceled }}
  </div>
  <el-progress :percentage="uploadState.hashPercent"></el-progress>

  <canvas width="500" height="200" ref="canvas"></canvas>
</template>

<script lang="ts">
import { defineComponent, onMounted, reactive, ref } from "vue"
import { useLargeFileHashAndUploader, UploadFileParams, FileMergeParams, verifyUploadFileParamas } from "@poyoho/shared-service/upload"
import { FileChunkDesc, UploadStatus } from "@poyoho/shared-service/upload/upload";

export function request({
  url,
  method = "post",
  data,
  headers = {},
  onProgress = (_: ProgressEvent) => {},
}) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.upload.onprogress = onProgress
    xhr.open(method, url);
    Object.keys(headers).forEach(key =>
      xhr.setRequestHeader(key, headers[key])
    );
    xhr.onreadystatechange = (e) => {
      if (xhr.readyState === 4) {
        if (xhr.status === 200) {
          resolve({ data: e.target })
        } else {
          // 错误处理
          reject(xhr.statusText);
        }
      }
    }
    xhr.onerror = e => {
      reject(e)
    }
    xhr.send(data)
  });
}

export default defineComponent({
  setup() {
    function uploadAPI (data: UploadFileParams) {
      const formData = new FormData()
      formData.append("chunk", data.chunk)
      formData.append("start_idx", data.startIdx.toString())
      formData.append("end_idx", data.endIdx.toString())
      formData.append("filename", data.filename)
      formData.append("filehash", data.filehash)
      return request({
        url: "http://localhost:3000/upload",
        data: formData,
        onProgress: (e) => {
          const percent =  e.loaded / e.total
          const offset = data.endIdx - data.startIdx
          const start = data.startIdx
          const end = data.startIdx + Math.ceil(offset * percent)
          drawPercent(start, end, "uploading")
        }
      })
    }

    function mergeAPI (data: FileMergeParams) {
      return request({
        url: "http://localhost:3000/merge",
        headers: {
          "content-type": "application/json"
        },
        data: JSON.stringify(data)
      })
    }

    async function verifyAPI (data: verifyUploadFileParamas): Promise<{
      shouldUpload: boolean,
      uploadedList: FileChunkDesc[]
    }> {
      const res = JSON.parse((await request({
        url: "http://localhost:3000/verify",
        headers: {
          "content-type": "application/json"
        },
        data: JSON.stringify(data)
      }) as any).data.response)
      return {
        shouldUpload: res.shouldUpload as boolean,
        uploadedList: res.uploadedList?.map(idxs => ({
          startIdx: Number(idxs[0]),
          endIdx: Number(idxs[1]),
          status: "pass"
        }))
      }
    }

    const uploadState = reactive({
      size: 0,
      hashPercent: 0,
      canceled: false,
    })
    const canvas = ref<HTMLCanvasElement>()
    const ctx = ref<CanvasRenderingContext2D>()

    const uploadService = useLargeFileHashAndUploader(
      uploadAPI,
      mergeAPI,
      verifyAPI,
    )

    uploadService.subscribe(state => {
      uploadState.hashPercent = Math.ceil(state.hashPercent)
      uploadState.canceled = state.canceled
      state.fileChunksDesc.forEach(chunk => {
        drawPercent(chunk.startIdx, chunk.endIdx, chunk.status)
      })
    })



    onMounted(() => {
      ctx.value = canvas.value.getContext("2d")
      ctx.value.fillStyle = "#666"
      ctx.value.fillRect(0, 0, 500, 10)
    })
    function drawPercent(start: number, end: number, status: UploadStatus) {
      const x1 = start * 500 / uploadState.size
      const x2 = end * 500 / uploadState.size
      switch(status) {
        case "pass": ctx.value.fillStyle = "#45c23a"; break
        case "ready": ctx.value.fillStyle = "#666666"; break
        case "uploading": ctx.value.fillStyle = "#0088ff"; break
        case "uploaded": ctx.value.fillStyle = "#45c23a"; break
        case "error": ctx.value.fillStyle = "#bc1717"; break
      }
      ctx.value.fillRect(Math.floor(x1), 0, Math.ceil(x2 - x1), 10)
    }

    return {
      canvas,
      uploadState,

      handleFileChange (e: { target: HTMLInputElement }) {
        uploadState.size = 0
        const [file] = Array.from(e.target.files)
        if (!file) return
        uploadState.size = file.size
        uploadService.changeFile(file)
      },

      async handleUpload () {
        await uploadService.upload()
      },

      handleStop () {
        uploadService.stop()
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
