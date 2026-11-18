# Findings

## Gate A: FAILED. Direction #3 (build-then-destroy) rejected. 3 Sep 2026

**Verdict (Emil, after playing the milestone 1 build on his phone): boring. Not the
execution, the idea.** Direction #3 is dropped.

### What was actually tested

Three levels, one ramp each, one shot. Placement, rotation, retry preserving the build,
star scoring, destruction, and a camera that framed the level while planning and followed
the shot. No sound, no particles, no screen shake, no slow motion, one part type.

### What this does and does not prove

It proves the core proposition failed to hold a player's interest in its minimal form.
The research called the build phase "a design hypothesis" that no shipping game had
validated; this is a data point against it, gathered for about a day of work rather than
the eight weeks the research's Stage 1 budgeted.

It does not prove a fully juiced version would fail. That version was never built. The
distinction was put to Emil explicitly and he chose "the whole idea", so the concept is
dropped rather than rescued.

### What was worth keeping

The engine work is concept-agnostic and stays: fixed-timestep loop, Rapier3D world,
instanced Three.js renderer holding 59 fps on a real phone at 5 draw calls, JSON levels
with schema validation, headless solvability testing, and the browser test harness.

### Process lessons that survive the concept

1. **Gate early on fun, before content.** One day of work produced a definitive answer.
   The research's own plan would have spent eight weeks first.
2. **A minimal build cannot test a proposition whose appeal is its payoff.** If the next
   concept's appeal depends on feel, the first playable must include the feel, even at
   the cost of shipping fewer levels.
3. **Verify the design, not just the code.** Every test passed while the game was boring,
   and the portrait framing was broken for a whole build without a single failure. Tests
   catch what you thought to check.
