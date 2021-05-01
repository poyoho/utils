<template>
  <div class="app">
    <DocHeader class="header" />
    <div class="relative">
      <Menu class="menu" :route="routes" />
      <div class="view">
        <RouterView />
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
<style scoped>
.app {
  width: 1080px;
  margin: 0 auto;
}
.header {
  display: flex;
  position: sticky;
  justify-content: space-between;
  z-index: 50;
  top: 0;
  width: 100%;
  background: #fff;
  padding: 0 30px;
  border-bottom: 1px solid #e6e6e6;
}

.menu {
  position: fixed;
  width: 140px;
  height: 100%;
  overflow-y: auto;
}
.view {
  margin-left: 160px;
}
</style>
