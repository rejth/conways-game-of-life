import cellComputeShader from "./shaders/compute.wgsl";
import cellFragmentShader from "./shaders/fragment.wgsl";
import cellVertexShader from "./shaders/vertex.wgsl";

function resizeCanvasToDisplaySize(canvas: HTMLCanvasElement): boolean {
  const devicePixelRatio = window.devicePixelRatio || 1;
  const displayWidth = Math.max(1, Math.floor(canvas.clientWidth * devicePixelRatio));
  const displayHeight = Math.max(1, Math.floor(canvas.clientHeight * devicePixelRatio));
  const needsResize = canvas.width !== displayWidth || canvas.height !== displayHeight;

  if (needsResize) {
    canvas.width = displayWidth;
    canvas.height = displayHeight;
  }

  return needsResize;
}

function writeBufferData(device: GPUDevice, buffer: GPUBuffer, data: Float32Array | Uint32Array): void {
  device.queue.writeBuffer(buffer, 0, data as unknown as GPUAllowSharedBufferSource);
}

export class RenderManager {
  private readonly gridSize = 64;
  private readonly workgroupSize = 8;
  private readonly updateInterval = 200;
  private readonly workgroupCount = Math.ceil(this.gridSize / this.workgroupSize);

  private adapter!: GPUAdapter;
  private device!: GPUDevice;
  private ctx!: GPUCanvasContext;
  private format!: GPUTextureFormat;
  private vertexBuffer!: GPUBuffer;
  private vertexBufferLayout!: GPUVertexBufferLayout;
  private uniformBuffer!: GPUBuffer;
  private vertexShader!: GPUShaderModule;
  private fragmentShader!: GPUShaderModule;
  private computeShader!: GPUShaderModule;
  private cellStateStorage!: [GPUBuffer, GPUBuffer];
  private bindGroupLayout!: GPUBindGroupLayout;
  private bindGroups!: [GPUBindGroup, GPUBindGroup];
  private cellPipelineLayout!: GPUPipelineLayout;
  private cellComputePipeline!: GPUComputePipeline;
  private cellRenderPipeline!: GPURenderPipeline;
  private vertices!: Float32Array;
  private canvas!: HTMLCanvasElement;
  private intervalId: number | undefined;
  private step = 0;

  constructor() {
    if (!navigator.gpu) {
      throw new Error("WebGPU is not supported in this browser.");
    }
  }

  async run(canvas: HTMLCanvasElement): Promise<void> {
    this.canvas = canvas;
    await this.init(canvas);

    this.vertices = new Float32Array([-0.8, -0.8, 0.8, -0.8, 0.8, 0.8, -0.8, -0.8, 0.8, 0.8, -0.8, 0.8]);

    const uniforms = new Float32Array([this.gridSize, this.gridSize]);

    this.createVertexBuffer(this.vertices, "Cell Vertices");
    this.createUniformBuffer(uniforms, "Cell Uniforms");

    this.createVertexShader(cellVertexShader, "Cell vertex shader");
    this.createFragmentShader(cellFragmentShader, "Cell fragment shader");
    this.createComputeShader(cellComputeShader, "Cell compute shader");

    this.createCellState();
    this.createBindGroupLayout();
    this.createPipelineLayout();
    this.createComputePipeline();
    this.createRenderPipeline();
    this.draw();
  }

  destroy(): void {
    if (this.intervalId !== undefined) {
      window.clearInterval(this.intervalId);
      this.intervalId = undefined;
    }
  }

  private async init(canvas: HTMLCanvasElement): Promise<void> {
    const adapter = await navigator.gpu.requestAdapter({ powerPreference: "high-performance" });
    if (!adapter) {
      throw new Error("No appropriate GPUAdapter found.");
    }

    this.adapter = adapter;
    this.device = await this.adapter.requestDevice();

    const ctx = canvas.getContext("webgpu");
    if (!ctx) {
      throw new Error("Failed to get WebGPU context.");
    }

    this.ctx = ctx;
    this.format = navigator.gpu.getPreferredCanvasFormat();
    this.configureCanvas();
  }

  private configureCanvas(): void {
    resizeCanvasToDisplaySize(this.canvas);
    this.ctx.configure({
      device: this.device,
      format: this.format,
      alphaMode: "opaque",
    });
  }

  private createVertexBuffer(vertices: Float32Array, label: string): void {
    this.vertexBuffer = this.device.createBuffer({
      label,
      size: vertices.byteLength,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });

    this.vertexBufferLayout = {
      arrayStride: 8,
      attributes: [
        {
          format: "float32x2",
          offset: 0,
          shaderLocation: 0,
        },
      ],
    };

    writeBufferData(this.device, this.vertexBuffer, vertices);
  }

  private createUniformBuffer(uniforms: Float32Array, label: string): void {
    this.uniformBuffer = this.device.createBuffer({
      label,
      size: uniforms.byteLength,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    writeBufferData(this.device, this.uniformBuffer, uniforms);
  }

  private createVertexShader(vertexShader: string, label: string): void {
    this.vertexShader = this.device.createShaderModule({
      label,
      code: vertexShader,
    });
  }

  private createFragmentShader(fragmentShader: string, label: string): void {
    this.fragmentShader = this.device.createShaderModule({
      label,
      code: fragmentShader,
    });
  }

  private createComputeShader(computeShader: string, label: string): void {
    this.computeShader = this.device.createShaderModule({
      label,
      code: computeShader,
    });
  }

  private createCellState(): void {
    const cellStateArray = new Uint32Array(this.gridSize * this.gridSize);

    for (let i = 0; i < cellStateArray.length; i += 1) {
      cellStateArray[i] = Math.random() > 0.6 ? 1 : 0;
    }

    this.cellStateStorage = [
      this.device.createBuffer({
        label: "Cell State A",
        size: cellStateArray.byteLength,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
      }),
      this.device.createBuffer({
        label: "Cell State B",
        size: cellStateArray.byteLength,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
      }),
    ];

    writeBufferData(this.device, this.cellStateStorage[0], cellStateArray);
  }

  private createBindGroupLayout(): void {
    const bindGroupLayout = this.device.createBindGroupLayout({
      label: "Cell Bind Group Layout",
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT | GPUShaderStage.COMPUTE,
          buffer: {},
        },
        {
          binding: 1,
          visibility: GPUShaderStage.VERTEX | GPUShaderStage.COMPUTE,
          buffer: { type: "read-only-storage" },
        },
        {
          binding: 2,
          visibility: GPUShaderStage.COMPUTE,
          buffer: { type: "storage" },
        },
      ],
    });

    this.bindGroupLayout = bindGroupLayout;
    this.bindGroups = [
      this.device.createBindGroup({
        label: "Cell renderer bind group A",
        layout: bindGroupLayout,
        entries: [
          { binding: 0, resource: { buffer: this.uniformBuffer } },
          { binding: 1, resource: { buffer: this.cellStateStorage[0] } },
          { binding: 2, resource: { buffer: this.cellStateStorage[1] } },
        ],
      }),
      this.device.createBindGroup({
        label: "Cell renderer bind group B",
        layout: bindGroupLayout,
        entries: [
          { binding: 0, resource: { buffer: this.uniformBuffer } },
          { binding: 1, resource: { buffer: this.cellStateStorage[1] } },
          { binding: 2, resource: { buffer: this.cellStateStorage[0] } },
        ],
      }),
    ];
  }

  private createPipelineLayout(): void {
    this.cellPipelineLayout = this.device.createPipelineLayout({
      label: "Cell Pipeline Layout",
      bindGroupLayouts: [this.bindGroupLayout],
    });
  }

  private createRenderPipeline(): void {
    this.cellRenderPipeline = this.device.createRenderPipeline({
      label: "Cell Render Pipeline",
      layout: this.cellPipelineLayout,
      vertex: {
        module: this.vertexShader,
        entryPoint: "main",
        buffers: [this.vertexBufferLayout],
      },
      fragment: {
        module: this.fragmentShader,
        entryPoint: "main",
        targets: [{ format: this.format }],
      },
    });
  }

  private createComputePipeline(): void {
    this.cellComputePipeline = this.device.createComputePipeline({
      label: "Simulation pipeline",
      layout: this.cellPipelineLayout,
      compute: {
        module: this.computeShader,
        entryPoint: "main",
      },
    });
  }

  private draw(): void {
    const updateGrid = () => {
      if (resizeCanvasToDisplaySize(this.canvas)) {
        this.configureCanvas();
      }

      const encoder = this.device.createCommandEncoder();
      const computePass = encoder.beginComputePass();

      computePass.setPipeline(this.cellComputePipeline);
      computePass.setBindGroup(0, this.bindGroups[this.step % 2]);
      computePass.dispatchWorkgroups(this.workgroupCount, this.workgroupCount);
      computePass.end();

      this.step += 1;

      const pass = encoder.beginRenderPass({
        colorAttachments: [
          {
            view: this.ctx.getCurrentTexture().createView(),
            loadOp: "clear",
            clearValue: { r: 0, g: 0, b: 0, a: 1 },
            storeOp: "store",
          },
        ],
      });

      pass.setPipeline(this.cellRenderPipeline);
      pass.setBindGroup(0, this.bindGroups[this.step % 2]);
      pass.setVertexBuffer(0, this.vertexBuffer);
      pass.draw(this.vertices.length / 2, this.gridSize * this.gridSize);
      pass.end();

      this.device.queue.submit([encoder.finish()]);
    };

    updateGrid();
    this.intervalId = window.setInterval(updateGrid, this.updateInterval);
  }
}
