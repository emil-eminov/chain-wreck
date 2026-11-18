# Spec: Build-Then-Destroy Physics Puzzle (working title: CHAIN WRECK)

Status: DRAFT, awaiting Emil's approval. No code exists yet.
Source of market context: `mobilegame.pdf` (Mobile Game Market Research, 2026), Direction #3.
Source of intent: interview with Emil, 3 Sep 2026 (recorded at the bottom of this file).

---

## 1. Objective

### What we are building

A mobile-web physics puzzle. Each level presents a target the player cannot hit directly. The
player places a small number of trap parts (ramps, dominoes, explosives, pendulums) into the
scene, then fires exactly one projectile. Physics resolves into a chain reaction. The target is
destroyed, or it is not, and the player tweaks the build and fires again.

The skill lives in the build. The destruction is the reward and the scoreboard.

### Why this, why now

The research names Direction #3 the best risk-adjusted entry of the four evaluated concepts.
Flow Games' *Smash Fest* validated the base smash mechanic in July 2026 (10.2M downloads, +343%
month over month, revenue $692K to $3.4M), and 38 near-clones plus 70 "smash"-titled launches
followed within weeks. Every one of them is aim-and-shoot. None adds a build phase. That is the
whitespace, and a crowded genre closes whitespace fast.

### Who the user is

1. **Primary: a hypercasual publisher's scout** (Voodoo, Lion Studios, Homa, Rollic). They
   screen on a 15 to 30 second video first and fund the CPI test themselves. Everything in this
   spec optimizes for a concept that reads instantly on video.
2. **Secondary: the players a publisher would test it on.** Mid-tier Android, short sessions,
   zero patience for a tutorial.

Emil has no UA budget, so the research's gates (CPI < $0.50, D1 >= 40%, D7 >= 12%) are not
measurable by us. They stay in this document as the numbers a publisher's test would be judged
against, not as our acceptance criteria. Ours are in section 8.

### What success looks like

A playable web build plus a submission clip good enough that a publisher runs their own test.
The honest internal gate comes earlier: at the end of Milestone 1, is the loop fun with one part
type and one level? If not, we stop and rethink rather than dressing up a loop that does not work.

---

## 2. Design

### 2.1 The loop (target: 45 to 90 seconds per level)

| Phase | Duration | What happens |
|---|---|---|
| Survey | ~2s | Camera pans across the level and settles. Target is visibly unreachable by a direct shot. |
| Build | 15 to 40s | Player drags parts from a tray into the scene, rotates them, repositions them freely. |
| Fire | 1 tap + drag | Player drags back from the launcher to aim and set power, releases. One projectile. |
| Chain | 3 to 8s | Physics runs. Slow motion triggers on the first significant impact. Debris, dust, sound. |
| Result | ~3s | Stars awarded, or a "so close" fail card. Retry keeps the build intact for editing. |

**Retry is the core of the fun, not a punishment.** The build persists across retries so the
player refines rather than restarts. This is what turns a 6 second smash into a 90 second puzzle,
and it is the single biggest difference from the *Smash Fest* clones.

### 2.2 Win condition

Destroy every red target in the scene with one shot. "Destroyed" means the target's health reaches
zero from accumulated impact energy, or it falls below the kill line at the bottom of the level.

Stars:
- 1 star: all targets destroyed.
- 2 stars: destroyed using fewer parts than the level's par.
- 3 stars: the gold bonus target (placed somewhere awkward) also destroyed.

Stars are the retention hook and cost almost nothing to build. They also give a publisher a
progression curve to look at.

### 2.3 Parts (6 total, introduced one at a time)

| Part | Behavior | Introduced |
|---|---|---|
| Ramp | Static angled surface. Redirects the projectile. | Level 1 |
| Domino | Tall thin dynamic block. Topples into neighbours. | Level 4 |
| TNT barrel | Explodes on impact above a threshold, radial impulse plus damage. | Level 8 |
| Bounce pad | Elastic surface, high restitution. | Level 12 |
| Pendulum | Weight on a fixed pivot, swings when struck. | Level 16 |
| Wrecking magnet | Attracts loose debris within a radius for one second after being hit. | Level 20 |

Each part is a box, a cylinder, or a compound of two, generated in code. No models, no textures.

### 2.4 Onboarding (the 5 second rule)

- Level 1 gives the player exactly one ramp and one obvious gap. No text, no tutorial overlay,
  just a pulsing outline where the ramp fits and a finger hint.
- Levels 1 to 3 use one part each. The first chain reaction that the player caused, not one that
  was scripted, must land inside 30 seconds of opening the game.
- No copy longer than three words appears anywhere in the first three levels.

If a first-time player needs an explanation, the design has failed and we fix the level, not the
copy.

### 2.5 Art direction

Code-generated stylized primitives. Flat shaded, no textures, no imported assets.

- Low-poly flat-shaded geometry. No textures, no imported models. Every mesh is built from box,
  cylinder and sphere primitives combined in code, hard edges, no smooth shading.
- One directional light plus ambient, a single low-resolution shadow map. Shadows are what make
  low-poly read as 3D rather than as untextured, so this is not optional.
- Palette: warm desert background, high-saturation red targets, near-black structural blocks,
  one accent (electric yellow) reserved exclusively for interactive parts. Red means "destroy
  this", yellow means "you can touch this", nothing else is ever red or yellow.
- Chunky proportions, thick outlines, generous rounded corners.
- Juice does the heavy lifting: particle bursts, debris chunks, screen shake, a 0.25x slow motion
  window on the first heavy impact, a freeze frame on the killing blow.
- Sound is generated procedurally through the Web Audio API (noise bursts shaped by envelopes for
  impacts and explosions, filtered sweeps for whooshes). Zero asset cost, and it matters more for
  perceived quality than the visuals do.

### 2.6 Deliberate 2.5D decision (revised 3 Sep 2026 at Emil's direction)

The game renders in 3D with a fixed camera, and gameplay is confined to a shallow depth slab.

The original spec called for flat 2D. Emil chose 3D, which is the right read of what publishers
are currently buying: *Smash Fest* and its 38 clones are all 3D, and a 2D entry would look dated
in a submission reel next to them.

What "2.5D" means concretely:
- Full 3D scene, meshes, lighting, shadows and depth. It looks like a 3D game because it is one.
- The camera is fixed per level (a shallow three-quarter angle), with an optional scripted pan
  during the chain reaction. The player never controls it.
- All physics bodies live within a depth slab about three body-widths deep. Objects can move and
  topple in Z, but no gameplay depends on judging depth, because depth is what players misjudge
  on a phone screen.

This is the compromise that keeps the rest of the plan viable. Free 3D with an orbiting camera
would cost: levels no longer authorable as readable JSON (they would need an editor, which is a
project of its own), aiming becomes a 3D problem that is hard to make feel good with one thumb,
and the frame budget on cheap Android stops being reachable.

Accepted costs of going 3D at all, stated plainly:
- Roughly 2.5 to 3x the work per level compared to 2D.
- Dynamic body budget drops from 150 to about 80. Destruction is chunkier, debris despawns sooner.
- Screenshot verification gets slower, since headless WebGL runs on a software rasteriser. Still
  workable, but my own test loop is measurably slower than it would have been in 2D.

**Open for override:** if you want a genuinely free 3D camera, say so now. That is a different
project, and I would want to cut the level count hard before agreeing to it.

### 2.7 Orientation, learned from the first phone test

A portrait phone is about 9:19.5. At a scale where a 0.9m target is large enough to aim at, that
screen shows roughly **six metres of level width**. The milestone 1 levels were laid out at
fifteen metres end to end, because they were designed on a landscape monitor. On a phone they
appeared as a thin band of action in a field of sky.

The camera now frames the whole level while the player builds and pushes in to follow the shot
when it fires, which makes every level playable in portrait. It does not fix the underlying
mismatch: **these levels are landscape-shaped, and a portrait screen has height to spare and no
width.** A level that is six metres wide and twelve metres tall would fill the same screen
completely.

**Decided (Emil, 3 Sep 2026): portrait-native levels.** Levels are now tall and narrow, about six
metres wide and six to eight tall, and the player shoots upward at towers rather than across at
walls. Portrait is the format the genre sells in, and a level shaped like the screen fills it.

Consequences for every level built from here:
- Keep the horizontal span near six metres. Framing distance is driven by width on a portrait
  screen, so every spare metre of width shrinks the whole level on screen.
- Height is free. Use it.
- The overhang still caps the launch angle, and the target sits above and beyond its edge. Build
  zones must extend PAST the overhang's edge: a ramp placed under the roof launches the ball into
  the roof's underside, so the workable placements are the ones out in the open.

---

## 3. Tech Stack

| Concern | Choice | Why |
|---|---|---|
| Language | TypeScript 5.x | Type safety matters more than usual when the author cannot review the code. |
| Bundler | Vite 6 | Fast dev loop, trivial single-file production build. |
| Physics | Rapier3D (`@dimforge/rapier3d-compat`, WASM) | Stable stacking and fast broadphase. Same API family as the 2D build if we ever retreat. |
| Rendering | Three.js r170+ (WebGL2) | The standard for 3D on the web. Instanced meshes keep draw calls flat as debris multiplies. |
| Audio | Web Audio API, procedural | No assets, no licensing, no download weight. |
| Tests | Vitest (logic) + Playwright (browser, screenshots) | Playwright is how I verify my own work without Emil in the loop. |
| Delivery | Single self-contained HTML, published as a private artifact | Emil opens a URL on his phone. No hosting, no accounts, no cost. |

No backend. No accounts. No network calls at runtime.

---

## 4. Commands

```
Install:      npm install
Dev server:   npm run dev
Build (web):  npm run build
Build (1file):npm run build:single      # inlines JS, CSS and the WASM as base64
Unit tests:   npm run test
E2E + shots:  npm run test:e2e
Lint:         npm run lint
Typecheck:    npm run typecheck
Verify all:   npm run verify            # typecheck + lint + test + test:e2e
```

`npm run verify` is the gate. No task is done until it passes.

---

## 5. Project Structure

```
src/
  core/        Fixed-timestep game loop, state machine, event bus
  physics/     Rapier world setup, body factories, destruction and damage model
  parts/       The six part definitions, placement validation
  levels/      Level JSON, loader, schema validation
  render/      Three.js scene graph, fixed camera, instancing, particles, debris
  audio/       Procedural sound synthesis
  ui/          Part tray, aim indicator, star results, level select
  telemetry/   Local-only event log, JSON export
tests/         Vitest unit tests
e2e/           Playwright specs and screenshot baselines
tasks/         plan.md and todo.md
docs/          Decisions and the publisher one-pager
```

---

## 6. Code Style

Plain functions and data over class hierarchies. Systems read the world, produce changes, and
return. No inheritance deeper than one level.

```ts
// parts/ramp.ts
import type { PartDefinition } from './types'

export const RAMP: PartDefinition = {
  id: 'ramp',
  label: 'Ramp',
  cost: 1,
  bodyType: 'fixed',
  shape: { kind: 'triangle', width: 1.6, height: 0.8 },
  material: { friction: 0.4, restitution: 0.1 },
  rotatable: true,
  snapDegrees: 15,
}

// physics/damage.ts
/** Impact energy below this is cosmetic only, so light taps never chip a target. */
const DAMAGE_THRESHOLD_J = 12

export function damageFromImpact(relativeSpeed: number, mass: number): number {
  const energy = 0.5 * mass * relativeSpeed ** 2
  return energy < DAMAGE_THRESHOLD_J ? 0 : energy - DAMAGE_THRESHOLD_J
}
```

Conventions: named exports only, `camelCase` functions, `SCREAMING_SNAKE` tuning constants
grouped at the top of their module, every tuning constant carrying a comment that says what
changes when you move it. Emil will want to ask "make the explosions bigger", and that must map
to one obvious number.

---

## 7. Testing Strategy

Three levels, each with a job:

1. **Unit (Vitest).** Pure logic: damage math, scoring and stars, part placement validity,
   parts budget, level schema validation, telemetry aggregation. Target 80% coverage on
   `src/core`, `src/parts`, `src/levels`. Physics itself is not unit tested; it is a library.
2. **Level solvability (Vitest, headless physics).** Every shipped level runs headless with a
   recorded known-good solution and must complete. This catches the failure mode where a tuning
   change silently makes level 17 impossible.
3. **Browser (Playwright).** Boot without console errors, complete level 1 by scripted input,
   sustained frame time under budget during a heavy chain, and screenshot comparison so I can
   see regressions myself rather than asking Emil to look.

**Where each number can honestly be measured.** The sandbox running the browser tests has no GPU,
so its frame times measure a software rasteriser rather than this game. Physics step cost, draw
calls, body counts and console errors are asserted there because they are CPU-side and
hardware-honest. Real frame rate is read from an on-screen stats overlay on a phone. See
`game/docs/perf-baseline.md`.

**Performance budget, enforced in CI as a test, not a hope:**
- 60fps sustained on a mid-tier Android profile (Playwright CPU throttle 4x), no frame over 33ms
  during a full chain reaction. This is the budget most at risk from the 3D decision, and it is
  the one I raise with Emil rather than quietly lowering.
- Max 80 simultaneous dynamic bodies (reduced from 150 for 3D). Debris despawns on a budget.
- Draw calls under 60. All repeated geometry instanced.
- Single-file build under 5MB, with geometry generated at runtime rather than shipped.
- Interactive within 3 seconds on a simulated 4G connection.

---

## 8. Success Criteria

These replace the research's CPI and retention gates, which are unmeasurable without ad spend.

**Gate A, end of Milestone 1 (the honest one):**
- With one part type and three levels, Emil replays a level to improve it without being asked.
- If this is false, we stop and redesign rather than continuing to build.

**Gate B, end of Milestone 3:**
- 5 first-time players, given the phone and no explanation, place a part and fire within 5 seconds.
- At least 3 of 5 retry a failed level twice or more, unprompted.
- Median levels completed in a first sitting is 8 or more.
- No player asks "what am I supposed to do".

**Gate C, end of Milestone 5 (submission ready):**
- 25 levels, all solvable, all with a recorded 3-star solution.
- `npm run verify` green, performance budget met under throttling.
- A 30 second clip showing: the problem, the build, the chain reaction, the payoff.
- Single-file playable under 5MB.
- A one-page publisher brief naming the hook in one sentence.

---

## 9. Boundaries

**Always**
- Run `npm run verify` before calling any task done.
- Generate every visual and every sound in code.
- Keep tuning constants named, commented, and in one place per system.
- Prefer deleting a feature over adding a setting.

**Ask Emil first**
- Adding any npm dependency beyond the five named in section 3.
- Changing the physics engine, the 2D decision, or the core loop.
- Anything that adds a server, an account, or a network call.
- Spending his time: playtests, downloads, external accounts.

**Never**
- Commit secrets or personal data.
- Ship third-party art, audio, or fonts with unclear licensing.
- Add analytics that phone home. Telemetry is local and exportable only.
- Build IAP, ads, or store integration in this phase. Leave the seams, build nothing.
- Weaken a test, a threshold, or the performance budget to get to green. Raise it with Emil instead.

---

## 10. Out of Scope

Unity, IAP, ads, backend, accounts, multiplayer, live-ops, meta-progression, daily rewards,
energy systems, store submission, localisation, and any real-money anything. Section 2 leaves
clean seams for the meta layer (a level map, a currency hook, a fail-offer slot) and builds none
of it. The research is explicit that meta investment before loop validation is the wrong order.

---

## 11. Open Questions

1. **Name.** "Chain Wreck" is a placeholder. Others: "Trapfall", "One Shot", "Rig & Ruin", "Setup".
2. **One shot, or a small budget of shots?** Specced as one shot with unlimited retries that
   preserve the build. A 3 shot budget is the obvious alternative and is a one-line change in
   Milestone 1. First thing to tune once it is playable.
3. **Fixed camera versus free 3D camera** (section 2.6). Specced as fixed. A free camera is a
   different project and would mean cutting the level count hard.
4. **Does the build phase survive contact with a real player?** This is the project's central
   unproven assumption, which is exactly why Gate A exists at the end of Milestone 1 rather than
   at the end.

---

## 12. Confirmed Intent (interview, 3 Sep 2026)

- Outcome: place trap parts around a fixed target, fire one shot, chain reaction, plus the clip that sells it.
- User: a hypercasual publisher's scout first, their test players second.
- Why now: the smash mechanic is validated and crowded, the build phase is unoccupied, the window is short.
- Success: a publisher runs a video test on their budget.
- Constraint: no money, no artist, no code written by Emil. Everything ships from code that can be run and verified without him.
- Out of scope: Unity, IAP, ads, backend, accounts, multiplayer, live-ops, meta-progression, store submission.
