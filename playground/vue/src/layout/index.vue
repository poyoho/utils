<template>
  <div class="app">
    <DocHeader class="sticky top-0 z-50 w-full bg-white border-b" />
    <div class="relative">
      <Menu id="menu" class="scroll fixed w-60 overflow-y-auto h-full" :route="routes" />
      <div class="flex">
        <div class="w-60"></div>
        <div class="flex-1 p-5 overflow-x-hidden h-full">
          <RouterView />
        </div>
      </div>

    </div>
  </div>
</template>
<script lang="ts">
import { defineComponent } from "vue"
import DocHeader from "./header.vue"
import Menu from "./menu"
import _routes from "../route/services"

export default defineComponent({
  name: "BasicLayout",
  components: {
    DocHeader,
    Menu,
  },
  setup() {
    const routes = _routes.find(route => route.path === "/services").children
    return {
      routes,
    }
  },
})
</script>
