import { createApp } from "vue"
import App from "./App.vue"
import ElementPlus from "element-plus"
import Router from "./route"
import 'element-plus/lib/theme-chalk/index.css'

const app = createApp(App)

app.use(ElementPlus)
app.use(Router)
app.mount("#app")

export default app
