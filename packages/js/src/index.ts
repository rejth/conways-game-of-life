import { RenderManager } from "./simulation/RenderManager";

export interface MountedSimulation {
  dispose: () => void;
}

export async function mountJsSimulation(canvas: HTMLCanvasElement): Promise<MountedSimulation> {
  const renderManager = new RenderManager();
  await renderManager.run(canvas);

  return {
    dispose: () => renderManager.destroy(),
  };
}
