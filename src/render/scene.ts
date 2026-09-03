import {
  AmbientLight,
  Color,
  DirectionalLight,
  Fog,
  PCFSoftShadowMap,
  Scene,
  WebGLRenderer,
} from 'three'
import { PALETTE } from './palette'

/**
 * Shadow map resolution. Shadows are what make untextured low-poly read as 3D
 * rather than as flat colour, so this is not the first thing to cut for
 * performance. Draw calls and body count are.
 */
const SHADOW_MAP_SIZE = 1024

export function createRenderer(canvas: HTMLCanvasElement): WebGLRenderer {
  const renderer = new WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' })
  // Capped: a 3x DPR phone would otherwise render nine times the pixels.
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = PCFSoftShadowMap
  return renderer
}

export function createScene(): Scene {
  const scene = new Scene()
  scene.background = new Color(PALETTE.sky)
  scene.fog = new Fog(PALETTE.sky, 40, 90)

  scene.add(new AmbientLight(0xffffff, 1.1))

  const sun = new DirectionalLight(0xfff0d0, 2.4)
  sun.position.set(8, 14, 6)
  sun.castShadow = true
  sun.shadow.mapSize.set(SHADOW_MAP_SIZE, SHADOW_MAP_SIZE)
  sun.shadow.camera.left = -18
  sun.shadow.camera.right = 18
  sun.shadow.camera.top = 18
  sun.shadow.camera.bottom = -18
  sun.shadow.camera.far = 60
  sun.shadow.bias = -0.0015
  scene.add(sun)

  return scene
}
