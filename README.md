# Conway's Game of Life: Rust wgpu/WASM and TypeScript WebGPU

This repo compares two browser GPU implementations of Conway's Game of Life:

- `packages/js`: a TypeScript implementation that talks directly to the browser WebGPU API.
- `packages/rust`: a Rust implementation built with `wgpu`, compiled to WebAssembly with `wasm-pack`, and mounted into the same Vue UI.

The root app provides two tabs so the simulations can be viewed from the same page and under the same browser/runtime conditions.

## Project Idea

Conway's Game of Life is a small ruleset with a large amount of parallel work: every cell reads its neighbors, applies the same rule, and writes the next state. That makes it a useful learning target for WebGPU compute shaders because the simulation can live almost entirely on the GPU.

The motivation is to compare the ergonomics and boundaries of two approaches:

- TypeScript + WebGPU keeps the browser API visible. It is direct, inspectable, and close to Web platform concepts such as adapters, devices, buffers, bind groups, render passes, and compute passes.
- Rust + `wgpu` brings stronger compile-time guarantees and a native-friendly GPU abstraction, while still targeting the browser through WASM.

Both versions use the same broad architecture: initialize a random grid, store cell state in GPU buffers, update the grid with a compute shader, and render every cell through instanced drawing. The repo is intentionally structured as a pnpm workspace so the two implementations can evolve independently while sharing one UI and one toolchain.

## Requirements

- Node.js with pnpm
- Rust
- `wasm-pack`
- A browser with WebGPU support

## Setup

```sh
pnpm install
```

## Development

```sh
pnpm dev
```

The dev command builds the Rust WASM package first, then starts Vite.

## Build

```sh
pnpm build
```

## Quality Checks

```sh
pnpm typecheck
pnpm lint
pnpm test
```

The repo uses Biome for formatting/linting, Oxlint for fast JavaScript/TypeScript linting, and Lefthook for pre-commit checks.
