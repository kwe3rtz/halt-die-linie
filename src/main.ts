import { Engine, Scene, Color4, HemisphericLight, Vector3 } from 'babylonjs';

const canvas = document.getElementById('gameCanvas');

if (!(canvas instanceof HTMLCanvasElement)) {
  throw new Error('Canvas element not found.');
}

const engine = new Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true });
const scene = new Scene(engine);
scene.clearColor = new Color4(0.12, 0.14, 0.18, 1);

new HemisphericLight('ambientLight', new Vector3(0, 1, 0), scene);

const resize = () => {
  engine.resize();
};

window.addEventListener('resize', resize);
engine.runRenderLoop(() => {
  scene.render();
});

resize();

window.addEventListener('beforeunload', () => {
  engine.stopRenderLoop();
  scene.dispose();
  engine.dispose();
  window.removeEventListener('resize', resize);
});
