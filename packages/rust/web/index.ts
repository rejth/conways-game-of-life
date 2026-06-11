export async function mountRustSimulation(canvas: HTMLCanvasElement): Promise<void> {
  if (!canvas.id) {
    canvas.id = "rust-life-canvas";
  }

  const wasm = await import("../pkg/conway_rust.js");
  await wasm.default();
  wasm.run_web(canvas.id);
}
