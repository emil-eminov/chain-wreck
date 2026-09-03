# Performance baseline

Recorded 3 Sep 2026, milestone 0, task T3b.

## Where each number can honestly be measured

The cloud sandbox that runs the browser tests has **no GPU**: headless Chromium
falls back to a software rasteriser. Wall-clock frame times measured there are
a property of SwiftShader, not of this game, and asserting on them would
produce a red test that means nothing and a green test that means less.

So the budget is split by what each environment can actually prove:

| Measurement | Where | Asserted in CI |
|---|---|---|
| Physics step cost (p95) | sandbox, CPU only | yes |
| Draw calls | sandbox, API-level counter | yes |
| Body count | sandbox | yes |
| Console errors | sandbox | yes |
| Visual regression | sandbox, screenshot diff | yes |
| **Real frame rate** | **a real phone** | **no, read from the on-screen stats overlay at Gate A** |

The frame-rate line is the one that matters commercially, and it is the one a
sandbox cannot answer. It gets answered on Emil's phone.

## Baseline, 80 dynamic bodies

| Metric | Budget | Measured | Headroom |
|---|---|---|---|
| p95 physics step | < 4.0 ms | **0.7 ms** | 5.7x |
| Draw calls | < 60 | **2** | 30x |
| Bodies | 80 | 80 | at budget |

Frame time in the sandbox was 99ms p95. That number is SwiftShader and is
deliberately not asserted.

## What changed to get here

The first run measured **160 draw calls for 80 bodies**: one colour pass and one
shadow pass per object, because every body had its own mesh. That is the 3D
decision's cost showing up on day one, exactly where the plan predicted it.

The fix was instancing (`src/render/instancing.ts`): all bodies of the same
primitive kind share one `InstancedMesh` with unit geometry scaled per instance.
Draw calls are now a function of how many *kinds* of shape exist, not how many
objects, so debris can multiply for free. 160 to 2.

## Reading this later

Physics has 5.7x headroom at the body budget, so the constraint on this game is
almost certainly GPU fill rate and shadow cost, not simulation. If frame rate
disappoints on a real phone, look at shadow map size and overdraw first, and do
not spend time optimising the physics.
