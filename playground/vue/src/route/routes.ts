import { RouteRecordRaw } from "vue-router"

const routes: RouteRecordRaw[] = [
  {
    path: "/",
    redirect: "/checkboxList"
  },
  {
    path: "/pagination",
    name: "分页表格",
    component: () => import("../views/pagination.vue")
  },
  {
    path: "/checkboxList",
    name: "多选checkbox",
    component: () => import("../views/checkboxList.vue")
  }
]

export default routes
