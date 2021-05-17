import { RouteRecordRaw, useRoute } from "vue-router"
import { defineComponent, computed, h, PropType, ComputedRef } from "vue"
import { ElMenu, ElMenuItem, ElSubmenu} from "element-plus"

function walkRoute (routes: RouteRecordRaw[], currentPath: ComputedRef<string>) {
  return routes.map(route => {
    if (route.children?.length) {
      return h(
        ElSubmenu,
        {
          index: route.path,
        },
        {
          default: () => walkRoute(route.children, currentPath),
          title: () => route.name,
        },
      )
    } else {
      return h(
        ElMenuItem,
        {
          index: route.path,
        },
        {
          title: () => route.name
        }
      )
    }
  })
}

export default defineComponent({
  name: "Route",
  props: {
    route: {
      type: Object as PropType<RouteRecordRaw[]>,
      require: true,
    },
  },
  render () {
    // 选中当前激活菜单
    const route = useRoute()
    const currentPath = computed(() => route.path)

    const routes = walkRoute(this.$props.route, currentPath)

    return h(
      ElMenu,
      {
        router: true
      },
      {
        default: () => [...routes, ...routes, ...routes, ...routes, ...routes, ...routes, ...routes, ...routes, ...routes, ...routes, ...routes, ...routes,...routes, ...routes, ...routes, ...routes, ...routes, ...routes,],
      },
    )
  },
})
