<template>
  <div class="app">
    <DocHeader class="sticky top-0 z-50 w-full bg-white" />
    <div class="relative">
      <Menu id="menu" class="scroll fixed w-60 overflow-y-auto" :route="routes" />
      <RouterView class="w-full pl-72" />
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
