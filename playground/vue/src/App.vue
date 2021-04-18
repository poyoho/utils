<template>
  <div class="links">
    <router-link
      v-for="route in routes"
      :key="route.path"
      :to="route.path"
    >
      {{ route.path }}
    </router-link>
  </div>
  <hr>
  <RouterView />
</template>

<script lang="ts">
import { defineComponent } from "vue"
import routes from "./route/routes"

export default defineComponent({
  name: "App",
  setup() {
    return {
      routes
    }
  }
})
</script>
<style scoped>
.links {
  width: 100%;
  display: flex;
  justify-content: space-around;
}
</style>
