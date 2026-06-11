# Conway's Game of Life

This repo compares two browser GPU implementations of Conway's Game of Life:

- `packages/js`: a TypeScript implementation that talks directly to the browser WebGPU API.
- `packages/rust`: a Rust implementation built with `wgpu`, compiled to WebAssembly with `wasm-pack`, and mounted into the same UI.

The root app provides two tabs so the simulations can be viewed from the same page and under the same browser/runtime conditions.

<img width="708" height="931" alt="image" src="https://github.com/user-attachments/assets/7666a590-7144-4b32-9ba4-ef691d3cc406" />

## Project Idea

Conway's Game of Life is a small ruleset with a large amount of parallel work: every cell reads its neighbors, applies the same rule, and writes the next state. That makes it a useful learning target for WebGPU compute shaders because the simulation can live almost entirely on the GPU.

The motivation is to compare the ergonomics and boundaries of two approaches:

- TypeScript + WebGPU keeps the browser API visible. It is direct, inspectable, and close to Web platform concepts such as adapters, devices, buffers, bind groups, render passes, and compute passes.
- Rust + `wgpu` brings stronger compile-time guarantees and a native-friendly GPU abstraction, while still targeting the browser through WASM.

Both versions use the same broad architecture: initialize a random grid, store cell state in GPU buffers, update the grid with a compute shader, and render every cell through instanced drawing.

## Prerequisites

### Install Rust

Install Rust using [rustup](https://rustup.rs/) (the official installer):

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

After installation, restart your terminal or run:

```bash
source $HOME/.cargo/env
```

Verify installation:

```bash
rustc --version
cargo --version
```

### Install wasm-pack

This project uses [wasm-pack](https://github.com/wasm-bindgen/wasm-pack) to compile the Rust crate to WebAssembly and generate the JavaScript bindings in `pkg/`.

Install with the official installer:

```bash
curl https://wasm-bindgen.github.io/wasm-pack/installer/init.sh -sSf | sh
```

Or with Cargo:

```bash
cargo install wasm-pack
```

Verify installation:

```bash
wasm-pack --version
```

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
