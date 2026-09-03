// Level geometry, authored here and emitted to src/levels/data by solve-levels.mjs.
// Kept as a script rather than JSON-by-hand so a level's shape and its recorded
// solution are produced together and can never drift apart.
//
// SHAPE, learned from the first phone test (SPEC 2.7): a portrait screen shows
// roughly six metres of width and plenty of height at a playable scale. Levels
// are therefore TALL and NARROW: about six metres wide and eight to ten tall,
// shooting upward at towers rather than sideways at walls. The earlier
// landscape layouts appeared as a thin band of action in a field of sky.
//
// BUILD ZONES extend PAST the overhang's edge on purpose. A ramp placed under
// the roof launches the ball into the roof's underside; the workable placements
// are the ones out in the open, and the zone has to reach them.
//
// FORCING THE RAMP, learned the hard way: with free aim, a ballistic arc clears
// almost any obstacle, so an obstacle alone never makes the ramp necessary. The
// first draft of these levels could be won without placing anything. Every
// level fires from under an overhang, which caps the launch angle, and puts the
// target above and beyond the overhang's edge. A ballistic path can only ever
// lose upward slope, so the height needed after the overhang cannot be reached
// by aiming alone. The ramp is the only way to gain it.

const GROUND = {
  shape: { kind: 'box', half: [11, 0.5, 3] },
  position: [0, -0.5, 0],
  look: 'ground',
}

/** The overhang that turns free aim into a constrained problem. */
const ROOF = (startX, endX, bottomY) => ({
  shape: { kind: 'box', half: [(endX - startX) / 2, 0.3, 1.5] },
  position: [(startX + endX) / 2, bottomY + 0.3, 0],
  look: 'roof',
})

export const LEVELS = [
  {
    id: '01',
    name: 'Up And Over',
    // The gentlest version: a short tower, a wide window of workable ramp
    // angles, and a target big enough to land on.
    launcher: { position: [-3, 1, 0], maxSpeed: 22 },
    killLineY: -4,
    par: 1,
    inventory: [{ part: 'ramp', count: 1 }],
    buildZones: [{ min: [-2.3, 0.18, -0.6], max: [1, 2.8, 0.6] }],
    terrain: [
      GROUND,
      ROOF(-5.2, -0.2, 3.2),
      { shape: { kind: 'box', half: [0.5, 2, 1.2] }, position: [2.4, 2, 0], look: 'stone' },
    ],
    structures: [],
    targets: [{ shape: { kind: 'box', half: [0.45, 0.9, 0.6] }, position: [2.4, 4.9, 0], health: 35 }],
  },
  {
    id: '02',
    name: 'High Rise',
    // Same move, taller tower. The ramp has to be steeper and better placed.
    launcher: { position: [-3, 1, 0], maxSpeed: 24 },
    killLineY: -4,
    par: 1,
    inventory: [{ part: 'ramp', count: 1 }],
    buildZones: [{ min: [-2.3, 0.18, -0.6], max: [1, 2.8, 0.6] }],
    terrain: [
      GROUND,
      ROOF(-5.2, -0.2, 3.2),
      { shape: { kind: 'box', half: [0.5, 2.3, 1.2] }, position: [2.5, 2.3, 0], look: 'stone' },
    ],
    structures: [],
    targets: [{ shape: { kind: 'box', half: [0.45, 0.9, 0.6] }, position: [2.5, 5.5, 0], health: 35 }],
  },
  {
    id: '03',
    name: 'Top Heavy',
    // The first level where the collapse does the work rather than the ball.
    // A stack of loose crates on a plinth: a hit anywhere on the tower brings
    // the target down, and the kill line finishes it.
    launcher: { position: [-3, 1, 0], maxSpeed: 24 },
    killLineY: -4,
    par: 1,
    inventory: [{ part: 'ramp', count: 1 }],
    buildZones: [{ min: [-2.3, 0.18, -0.6], max: [1, 2.8, 0.6] }],
    terrain: [
      GROUND,
      ROOF(-5.2, -0.2, 3.2),
      // The plinth: solid, so a flat shot simply stops against it.
      { shape: { kind: 'box', half: [0.9, 2, 1.2] }, position: [2.6, 2, 0], look: 'stone' },
    ],
    structures: [
      { shape: { kind: 'box', half: [0.32, 0.32, 0.6] }, position: [2.6, 4.32, 0], look: 'crate' },
      { shape: { kind: 'box', half: [0.32, 0.32, 0.6] }, position: [2.6, 4.96, 0], look: 'crate' },
      { shape: { kind: 'box', half: [0.32, 0.32, 0.6] }, position: [2.6, 5.6, 0], look: 'crate' },
    ],
    targets: [{ shape: { kind: 'box', half: [0.32, 0.32, 0.6] }, position: [2.6, 6.24, 0], health: 30 }],
  },
]
