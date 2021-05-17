import { createApp } from "vue"
import ElementPlus from "element-plus"
import Router from "./route"
import 'element-plus/lib/theme-chalk/index.css'
import { RouterView } from "vue-router"
import "./index.css"

const app = createApp(RouterView)
app.use(ElementPlus)
app.use(Router)
app.mount("#app")

export default app
