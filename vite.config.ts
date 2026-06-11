import vue from "@vitejs/plugin-vue";
import { defineConfig } from "vite";
import glsl from "vite-plugin-glsl";
import wasm from "vite-plugin-wasm";

export default defineConfig({
  plugins: [vue(), glsl(), wasm()],
  build: {
    target: "esnext",
  },
  server: {
    open: true,
  },
});
