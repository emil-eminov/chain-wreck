import { startLoop } from './core/loop'
import { FrameSampler } from './core/harness'
import { Session } from './core/session'
import { LEVELS } from './levels'
import { partById } from './parts/registry'
import { CameraRig, createCamera } from './render/camera'
import { createRenderer, createScene } from './render/scene'
import { View } from './render/view'
import { createHud } from './ui/hud'
import { pointerToWorld } from './ui/pointer'
import { initPhysics } from './physics/world'
import type { Vec3 } from './levels/types'

const RAMP = 'ramp'

/** Longest drag, in pixels, that still counts as more power. */
const MAX_DRAG_PIXELS = 220

export async function start(canvas: HTMLCanvasElement, hudParent: HTMLElement): Promise<void> {
  await initPhysics()

  const renderer = createRenderer(canvas)
  const scene = createScene()
  const camera = createCamera(window.innerWidth / window.innerHeight)
  const rig = new CameraRig(camera, 0)
  const view = new View(scene)
  const frames = new FrameSampler()
  const steps = new FrameSampler()

  let levelIndex = 0
  let session!: Session
  let rotation = 0.5
  let dragging: { readonly startX: number; readonly startY: number } | null = null

  const hud = createHud(hudParent, {
    onRotate: (delta) => {
      rotation += (delta * Math.PI) / 180
      // Rotating after placing re-places the part: simpler than mutating a
      // body in the world, and it reuses the same validity rules.
      if (session.remaining(RAMP) === 0) {
        const last = session.lastPlacement
        session.undo()
        if (last) session.place(RAMP, last.position, rotation)
        refresh()
      }
    },
    onUndo: () => {
      session.undo()
      refresh()
    },
    onFire: () => {
      session.beginAim()
      refresh()
    },
    onCancelAim: () => {
      session.cancelAim()
      view.hideTrajectory()
      refresh()
    },
    onRetry: () => {
      session.retry()
      hud.hideResult()
      rig.frameWholeLevel()
      refresh()
    },
    onNext: () => {
      levelIndex = (levelIndex + 1) % LEVELS.length
      load()
      hud.hideResult()
    },
  })

  function load(): void {
    view.reset()
    session = new Session(LEVELS[levelIndex]!, {
      onReset: () => view.reset(),
      onSpawn: (info) => view.add(info),
      onDespawn: (body) => view.remove(body),
    })
    rotation = 0.5
    view.setLevelDecor(session.spec.launcher.position, session.spec.buildZones)
    rig.setAspect(window.innerWidth / window.innerHeight)
    rig.setLevelBounds(...levelBounds())
    rig.frameWholeLevel()
    rig.snap()
    hud.setLevel(session.spec.name, levelIndex, LEVELS.length)
    refresh()
  }

  function stocked(): number {
    return session.spec.inventory.find((entry) => entry.part === RAMP)?.count ?? 0
  }

  function refresh(): void {
    hud.setPhase(session.phase)
    hud.setParts(session.remaining(RAMP), stocked())
    if (session.phase !== 'BUILD') view.hideGhost()
  }

  function worldAt(event: PointerEvent): Vec3 | null {
    const point = pointerToWorld(camera, event.clientX, event.clientY, window.innerWidth, window.innerHeight)
    return point ? [point.x, point.y, 0] : null
  }

  canvas.addEventListener('pointerdown', (event) => {
    canvas.setPointerCapture(event.pointerId)
    if (session.phase === 'AIM') {
      dragging = { startX: event.clientX, startY: event.clientY }
      return
    }
    if (session.phase === 'BUILD') updateGhost(event)
  })

  canvas.addEventListener('pointermove', (event) => {
    if (session.phase === 'AIM' && dragging) {
      const aim = aimFrom(event)
      view.showTrajectory(session.spec.launcher.position, aim.direction, aim.power * session.spec.launcher.maxSpeed)
      return
    }
    if (session.phase === 'BUILD' && event.buttons !== 0) updateGhost(event)
  })

  canvas.addEventListener('pointerup', (event) => {
    if (session.phase === 'AIM' && dragging) {
      const aim = aimFrom(event)
      dragging = null
      view.hideTrajectory()
      if (aim.power > 0.05) {
        session.fire(aim.direction, aim.power)
        refresh()
      }
      return
    }
    if (session.phase === 'BUILD') {
      const point = worldAt(event)
      if (point) {
        session.place(RAMP, point, rotation)
        view.hideGhost()
        refresh()
      }
    }
  })

  /** Slingshot: drag away from where you want the shot to go. */
  function aimFrom(event: PointerEvent): { direction: Vec3; power: number } {
    const dx = dragging!.startX - event.clientX
    const dy = event.clientY - dragging!.startY
    const distance = Math.hypot(dx, dy)
    return {
      direction: [dx === 0 && dy === 0 ? 1 : dx, dy, 0],
      power: Math.min(distance / MAX_DRAG_PIXELS, 1),
    }
  }

  function updateGhost(event: PointerEvent): void {
    const point = worldAt(event)
    if (!point) return
    if (session.remaining(RAMP) <= 0) {
      view.hideGhost()
      return
    }
    view.showGhost(partById(RAMP), point, rotation, session.check(RAMP, point, rotation) === 'ok')
  }

  /** The span worth showing: launcher at one end, furthest target at the other. */
  function levelBounds(): [number, number] {
    const xs = [
      session.spec.launcher.position[0],
      ...session.spec.targets.map((t) => t.position[0]),
      ...session.spec.structures.map((s) => s.position[0]),
    ]
    return [Math.min(...xs) - 1.8, Math.max(...xs) + 1.8]
  }

  /** Where the furthest target is, for the moment after the shot lands. */
  function targetFocusX(): number {
    const xs = session.spec.targets.map((t) => t.position[0])
    return xs.length > 0 ? Math.max(...xs) : session.spec.launcher.position[0]
  }

  function resize(): void {
    renderer.setSize(window.innerWidth, window.innerHeight, false)
    if (!session) return
    rig.setAspect(window.innerWidth / window.innerHeight)
    rig.setLevelBounds(...levelBounds())
  }
  resize()
  window.addEventListener('resize', resize)
  load()

  let frameStart = performance.now()
  startLoop(
    () => {
      const started = performance.now()
      const resolved = session.step()
      steps.record(performance.now() - started)
      if (resolved) {
        const result = session.result
        hud.setResult(result.stars, result.partsUsed, result.par, result.stars > 0)
        refresh()
      }
    },
    () => {
      // Wide while planning, close while watching.
      const shot = session.projectile
      if (session.phase === 'SIMULATE' && shot) rig.followAction(shot.translation().x)
      else if (session.phase === 'SIMULATE' || session.phase === 'RESULT') rig.followAction(targetFocusX())
      else rig.frameWholeLevel()
      rig.update()
      view.sync()
      renderer.render(scene, camera)
      const now = performance.now()
      frames.record(now - frameStart)
      frameStart = now
      const summary = frames.summary()
      if (summary.frames > 0 && summary.frames % 30 === 0) {
        // Read on a real phone at Gate A: the sandbox has no GPU and cannot
        // answer the frame-rate question (docs/perf-baseline.md).
        hud.setStats(`${(1000 / Math.max(summary.p95Ms, 0.01)).toFixed(0)} fps p95\n${renderer.info.render.calls} draws`)
      }
    },
  )

  window.__chainwreck = {
    stress: () => {},
    stats: () => ({
      ...frames.summary(),
      drawCalls: renderer.info.render.calls,
      bodies: session.world.bodies.len(),
      stepMs: steps.summary().p95Ms,
    }),
    resetStats: () => {
      frames.reset()
      steps.reset()
    },
    fireSolution: () => {
      const solution = session.spec.solution
      if (!solution) return false
      for (const placement of solution.placements) session.place(placement.part, placement.position, placement.rotationZ)
      session.fire(solution.aim, solution.power)
      refresh()
      return true
    },
    phase: () => session.phase,
  }
}
