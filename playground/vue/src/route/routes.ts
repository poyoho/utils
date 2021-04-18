import { RouteRecordRaw } from "vue-router"

const routes: RouteRecordRaw[] = [
  {
    path: "/",
    redirect: "/pagination"
  },
  {
    path: "/pagination",
    component: () => import("../views/pagination.vue")
  }
]

export default routes
