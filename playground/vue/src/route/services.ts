import { h } from "vue"
import { RouteRecordRaw, RouterView } from "vue-router"

const pages = import.meta.glob("../views/**/*.vue")

// 文档路由
const serviceRoute = Object.keys(pages).reduce((prev, next) => {
  let prevRoute = "/"
  const page = next.replace("../views/", "").split("/")
  page.reduce((routes, nextPage) => {
    prevRoute += nextPage + "/"
    if (nextPage.endsWith(".vue")) {
      routes.push({
        name: nextPage.replace(".vue", ""),
        path: prevRoute.replace(".vue", ""),
        component: pages[next],
      })
    } else {
      const route = routes.find(route => route.name === nextPage)
      if (!route) {
        const children = []
        routes.push({
          name: nextPage,
          path: prevRoute,
          component: h(RouterView),
          children,
        })
        return children
      }
      return route.children
    }
  }, prev)

  return prev
}, [])

const routes: RouteRecordRaw[] = [
  {
    path: "/",
    redirect: "/uploadLargeFile",
  },
  {
    path: "/services",
    redirect: "/uploadLargeFile",
    component: () => import("../layout/index.vue"),
    children: serviceRoute,
  },
]

export default routes
