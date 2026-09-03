// Level geometry, authored here and emitted to src/levels/data by solve-levels.mjs.
// Kept as a script rather than JSON-by-hand so a level's shape and its recorded
// solution are produced together and can never drift apart.
//
// DESIGN CONSTRAINT, learned the hard way: with free aim, a ballistic arc
// clears almost any wall, so a wall alone never makes the ramp necessary. The
// first draft of levels 1 and 3 could both be won without placing anything.
// Every level therefore fires from under an overhang, which caps the launch
// angle, and puts the obstacle past the overhang's edge. The ramp is the only
// way to gain height in the gap between the two.

const GROUND = (halfWidth = 16) => ({
  shape: { kind: 'box', half: [halfWidth, 0.5, 3] },
  position: [0, -0.5, 0],
  look: 'ground',
})

/** The overhang that turns free aim into a constrained problem. */
const ROOF = (endX, y) => ({
  shape: { kind: 'box', half: [(endX + 11) / 2, 0.3, 1.5] },
  position: [(endX - 11) / 2, y, 0],
  look: 'roof',
})

export const LEVELS = [
  {
    id: '01',
    name: 'Up And Over',
    // Geometry derived from the ballistics rather than eyeballed. Under the
    // roof a direct shot can only reach about 2.0m at the wall, so a 2.2m wall
    // blocks it. A ramp near the roof's edge deflects the shot to roughly 60
    // degrees, which clears the wall with room to spare. The gap between "too
    // low to pass" and "too high to escape the roof" is the puzzle.
    launcher: { position: [-9, 0.9, 0], maxSpeed: 24 },
    killLineY: -4,
    par: 1,
    inventory: [{ part: 'ramp', count: 1 }],
    buildZones: [{ min: [-3, 0.16, -0.6], max: [0.8, 1.8, 0.6] }],
    terrain: [
      GROUND(),
      ROOF(0, 2.3),
      { shape: { kind: 'box', half: [0.35, 1.1, 1.2] }, position: [1.9, 1.1, 0], look: 'stone' },
    ],
    structures: [],
    // A pillar rather than a cube: a shot arriving steeply from above needs
    // something with a vertical face to hit, or every near miss sails past it.
    targets: [{ shape: { kind: 'box', half: [0.45, 0.9, 0.6] }, position: [3.9, 0.9, 0], health: 40 }],
  },
  {
    id: '02',
    name: 'Wall Job',
    // Same wall height as level 1, but set further out with the target further
    // still. Varying the distance rather than the wall height keeps the level
    // inside the narrow angle window that the roof leaves open: a taller wall
    // demanded a ramp angle the geometry cannot actually produce.
    launcher: { position: [-9, 0.9, 0], maxSpeed: 24 },
    killLineY: -4,
    par: 1,
    inventory: [{ part: 'ramp', count: 1 }],
    buildZones: [{ min: [-3, 0.16, -0.6], max: [0.8, 1.8, 0.6] }],
    terrain: [
      GROUND(),
      ROOF(0, 2.3),
      { shape: { kind: 'box', half: [0.35, 1.1, 1.2] }, position: [2.4, 1.1, 0], look: 'stone' },
    ],
    structures: [],
    targets: [{ shape: { kind: 'box', half: [0.45, 0.9, 0.6] }, position: [4.6, 0.9, 0], health: 30 }],
  },
  {
    id: '03',
    name: 'Top Heavy',
    // The first level where the collapse does the work rather than the ball.
    // The target rides the top of a loose stack behind the wall, so a hit
    // anywhere on the tower brings it down.
    launcher: { position: [-9, 0.9, 0], maxSpeed: 26 },
    killLineY: -4,
    par: 1,
    inventory: [{ part: 'ramp', count: 1 }],
    buildZones: [{ min: [-3, 0.16, -0.6], max: [0.8, 1.8, 0.6] }],
    terrain: [
      GROUND(),
      ROOF(0, 2.3),
      { shape: { kind: 'box', half: [0.35, 1.1, 1.2] }, position: [1.9, 1.1, 0], look: 'stone' },
    ],
    structures: [
      { shape: { kind: 'box', half: [0.35, 0.35, 0.6] }, position: [5, 0.35, 0], look: 'crate' },
      { shape: { kind: 'box', half: [0.35, 0.35, 0.6] }, position: [5, 1.05, 0], look: 'crate' },
      { shape: { kind: 'box', half: [0.35, 0.35, 0.6] }, position: [5, 1.75, 0], look: 'crate' },
    ],
    targets: [{ shape: { kind: 'box', half: [0.35, 0.35, 0.6] }, position: [5, 2.45, 0], health: 35 }],
  },
]
