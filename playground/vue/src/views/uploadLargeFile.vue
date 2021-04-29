<template>
  <div>
   <input type="file" @change="handleFileChange" />
   <el-button @click="handleUpload">上传</el-button>
 </div>
</template>

<script lang="ts">
import { defineComponent, reactive} from "vue"

export default defineComponent({
  setup() {
    const state = reactive({
      container: {
        file: null
      }
    })

    function handleFileChange(e) {
      const [file] = e.target.files;
      if (!file) return;
      Object.assign(this.$data, this.$options.data());
      this.container.file = file;
    }

    function handleUpload () {
      console.log();
    }

    return {
      state,
      handleFileChange,
      handleUpload,
    }

  }
})
</script>
