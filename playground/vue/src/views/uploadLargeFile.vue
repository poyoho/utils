<template>
  <div>
   <input type="file" @change="handleFileChange" />
   <el-button @click="handleUpload">上传</el-button>
 </div>
</template>

<script lang="ts">
import { defineComponent, reactive } from "vue"
import { request } from "@poyoho/shared-service"

const SIZE = 10 * 1024 * 1024 // 切片大小

export default defineComponent({
  setup() {
    const state = reactive({
      container: {
        file: null
      },
      data: []
    })

    function handleFileChange(e: { target: HTMLInputElement }) {
      const [file] = Array.from(e.target.files)
      if (!file) return
      state.container.file = file
    }

    function createFileChunk(file: File, size = SIZE) {
      const fileChunkList = []
      let cur = 0
      while (cur < file.size) {
        fileChunkList.push({ file: file.slice(cur, cur + size) })
        cur += size
      }
      return fileChunkList
    }

    async function uploadChunks() {
      const requestList = state.data
        .map(({ chunk, hash }) => {
          const formData = new FormData()
          formData.append("chunk", chunk)
          formData.append("hash", hash)
          formData.append("filename", state.container.file.name)
          return { formData }
        })
        .map(async ({ formData }) => {
          return request({
            url: "http://localhost:3000/chunk",
            data: formData
          })
        })
      await Promise.all(requestList) // 并发切片
    }

    async function handleUpload() {
      if (!state.container.file) return
      const fileChunkList = createFileChunk(state.container.file)
      state.data = fileChunkList.map(({ file }, idx) => ({
        chunk: file,
        hash: state.container.file.name + "-" + idx // 文件名 + 数组下标
      }))
      await uploadChunks()
    }

    return {
      state,
      handleFileChange,
      handleUpload,
    }

  }
})
</script>
