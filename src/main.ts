import type RAPIER from '@dimforge/rapier3d-compat'
import { Quaternion, Vector3 } from 'three'
import { startLoop } from './core/loop'
import { FrameSampler } from './core/harness'
import { addBody, type BodySpec } from './physics/bodies'
import { createWorld, initPhysics } from './physics/world'
import { createCamera, resizeCamera } from './render/camera'
import { createRenderer, createScene } from './render/scene'
import { InstanceRegistry, type InstancePool, scaleFor } from './render/instancing'
import { PALETTE } from './render/palette'

interface Entity {
  readonly body: RAPIER.RigidBody
  readonly pool: InstancePool
  readonly index: number
  readonly scale: Vector3
}

async function main(): Promise<void> {
  await initPhysics()

  const canvas = document.getElementById('stage') as HTMLCanvasElement
  const renderer = createRenderer(canvas)
  const scene = createScene()
  const camera = createCamera(window.innerWidth / window.innerHeight)
  const world = createWorld()
  const instances = new InstanceRegistry(scene)
  const entities: Entity[] = []
  const frameSampler = new FrameSampler()
  const stepSampler = new FrameSampler()

  // Reused across the sync loop so a busy frame allocates nothing.
  const position = new Vector3()
  const rotation = new Quaternion()

  function spawn(spec: BodySpec, color: number): void {
    const body = addBody(world, spec)
    const pool = instances.pool(spec.shape.kind)
    entities.push({ body, pool, index: pool.acquire(color), scale: scaleFor(spec.shape) })
  }

  spawn(
    { shape: { kind: 'box', half: [14, 0.5, 6] }, position: [0, -0.5, 0], dynamic: false },
    PALETTE.ground,
  )

  // A small stack, so the first thing anyone sees is physics behaving.
  for (let i = 0; i < 5; i++) {
    spawn(
      { shape: { kind: 'box', half: [0.3, 0.3, 0.3] }, position: [0, 0.3 + i * 0.62, 0], dynamic: true },
      i === 4 ? PALETTE.target : PALETTE.structure,
    )
  }

  function resize(): void {
    renderer.setSize(window.innerWidth, window.innerHeight, false)
    resizeCamera(camera, window.innerWidth / window.innerHeight)
  }
  resize()
  window.addEventListener('resize', resize)

  let frameStart = performance.now()
  startLoop(
    () => {
      const started = performance.now()
      world.step()
      stepSampler.record(performance.now() - started)
    },
    () => {
      for (const entity of entities) {
        const t = entity.body.translation()
        const r = entity.body.rotation()
        entity.pool.set(
          entity.index,
          position.set(t.x, t.y, t.z),
          rotation.set(r.x, r.y, r.z, r.w),
          entity.scale,
        )
      }
      instances.flush()
      renderer.render(scene, camera)
      const now = performance.now()
      frameSampler.record(now - frameStart)
      frameStart = now
    },
  )

  window.__chainwreck = {
    stress(count: number) {
      for (let i = 0; i < count; i++) {
        spawn(
          {
            shape: { kind: 'box', half: [0.22, 0.22, 0.22] },
            position: [(i % 9) * 0.5 - 2, 2 + Math.floor(i / 9) * 0.55, ((i % 3) - 1) * 0.35],
            dynamic: true,
          },
          PALETTE.structure,
        )
      }
    },
    stats: () => ({
      ...frameSampler.summary(),
      drawCalls: renderer.info.render.calls,
      bodies: world.bodies.len(),
      // p95 rather than mean: an occasional expensive step is what drops frames.
      stepMs: stepSampler.summary().p95Ms,
    }),
    resetStats: () => {
      frameSampler.reset()
      stepSampler.reset()
    },
  }
}

void main()
