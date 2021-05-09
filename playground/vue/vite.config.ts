import { defineConfig } from "vite"
import path from "path"
import vue from "@vitejs/plugin-vue"

export default defineConfig({
  server: {
    port: 3050,
  },
  plugins: [
    vue(),
  ],
  resolve: {
    alias:{
      "@": path.join(__dirname, "src")
    }
  }
})
