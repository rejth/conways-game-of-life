<script setup lang="ts">
import { mountJsSimulation } from "@conway/js";
import { mountRustSimulation } from "@conway/rust";
import { onUnmounted, ref, watch } from "vue";

type Demo = "js" | "rust";

const demos: Array<{ id: Demo; label: string; caption: string }> = [
  {
    id: "js",
    label: "TS WebGPU",
    caption: "Compute and render pipelines written directly against the browser WebGPU API.",
  },
  {
    id: "rust",
    label: "Rust wgpu WASM",
    caption: "The same simulation model compiled from Rust to WebAssembly and driven by wgpu.",
  },
];

const activeDemo = ref<Demo>("js");
const jsCanvasRef = ref<HTMLCanvasElement | null>(null);
const rustCanvasRef = ref<HTMLCanvasElement | null>(null);
const rustStarted = ref(false);

let jsDispose: (() => void) | undefined;
let jsMountCancelled = false;

function unmountJsSimulation() {
  jsMountCancelled = true;
  jsDispose?.();
  jsDispose = undefined;
}

function mountJsDemo() {
  const canvas = jsCanvasRef.value;
  if (activeDemo.value !== "js" || !canvas) {
    return;
  }

  jsMountCancelled = false;

  mountJsSimulation(canvas).then((mountedDemo) => {
    if (jsMountCancelled) {
      mountedDemo.dispose();
      return;
    }
    jsDispose = mountedDemo.dispose;
  });
}

watch(
  [activeDemo, jsCanvasRef],
  ([demo]) => {
    if (demo === "js") {
      mountJsDemo();
      return;
    }

    unmountJsSimulation();
  },
  { flush: "post" },
);

watch(
  [activeDemo, rustCanvasRef],
  ([demo]) => {
    if (demo !== "rust" || rustStarted.value || !rustCanvasRef.value) {
      return;
    }

    rustStarted.value = true;
    mountRustSimulation(rustCanvasRef.value);
  },
  { flush: "post" },
);

onUnmounted(() => {
  unmountJsSimulation();
});
</script>

<template>
  <main class="app-shell">
    <header class="toolbar">
      <div>
        <h1>Conway's Game of Life</h1>
        <p>{{ demos.find((demo) => demo.id === activeDemo)?.caption }}</p>
      </div>
      <div class="tabs" role="tablist" aria-label="Simulation runtime">
        <button
          v-for="demo in demos"
          :key="demo.id"
          :aria-selected="activeDemo === demo.id"
          class="tab"
          role="tab"
          type="button"
          @click="activeDemo = demo.id"
        >
          {{ demo.label }}
        </button>
      </div>
    </header>

    <section class="stage" aria-label="Game of Life simulations">
      <div class="demo-panel" :data-active="activeDemo === 'js'">
        <canvas ref="jsCanvasRef" aria-label="TypeScript WebGPU simulation" />
      </div>
      <div class="demo-panel" :data-active="activeDemo === 'rust'">
        <canvas
          id="rust-life-canvas"
          ref="rustCanvasRef"
          aria-label="Rust wgpu WASM simulation"
        />
      </div>
    </section>
  </main>
</template>
