<template>
  <div class="flex justify-between">
    <div class="logo">
      <img src="https://raw.githubusercontent.com/poyoho/blog/master/assets/logo.svg" width="60">
    </div>
    <ElMenu
      mode="horizontal"
      text-color="#409eff"
      active-text-color="#1989fa"
      :default-active="activeKey"
      router
    >
      <ElMenuItem index="/services">服务</ElMenuItem>
    </ElMenu>
  </div>
</template>


<script lang="ts">
import { defineComponent, ref, unref, watch } from "vue"
import { ElMenu, ElMenuItem } from "element-plus"
import { useRouter } from "vue-router"
export default defineComponent({
  name: "DocHeader",
  components: { ElMenu, ElMenuItem },
  setup() {
    const { currentRoute } = useRouter()
    const activeKey = ref("/components")
    watch (
      () => unref(currentRoute).path,
      path => {
        const arr = path.split("/")
        activeKey.value = "/" + arr[1]
      },{
        immediate: true,
      },
    )
    return { activeKey }
  },
})
</script>
