import { createRouter, createWebHistory } from "vue-router"
import service from "./services"

const router = createRouter({
  history: createWebHistory(),
  routes: [...service],
})

export default router
