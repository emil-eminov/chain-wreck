# Chain Wreck

Build a trap, fire one shot, watch the chain reaction. See `../SPEC.md` for the
specification and `../tasks/` for the plan and task list.

## Working on this project

Source of truth is this folder. Type checking, linting and unit tests run here:

```
npm install
npm run dev        # play at the printed localhost URL
npm run verify     # typecheck + lint + unit tests
```

Browser tests need Chromium, which cannot be installed on this machine, so they
run in the cloud sandbox instead:

```
npm run test:e2e   # requires CW_CHROMIUM to point at a Chromium binary
```

Build output goes to `~/cw-build/dist`, deliberately outside this folder: the
folder is mounted without delete permission, so Vite cannot clear an out-dir
inside it and every rebuild after the first fails.

## Layout

| Path | What lives there |
|---|---|
| `src/core` | Fixed-timestep loop, phase state machine, debug harness |
| `src/physics` | Rapier3D world, body factory, depth slab |
| `src/render` | Three.js scene, fixed camera, instancing, palette |
| `tests` | Vitest unit and headless-physics tests |
| `e2e` | Playwright smoke, screenshot and performance tests |
| `docs` | Performance baseline and decisions |
