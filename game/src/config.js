// Sunset Courier — tuning constants and level definitions.
// One world, one archipelago; each level flies a different ring course
// through it with its own light, wind and fuel budget.

export const WORLD = {
  size: 3600, // world spans -1800..1800 on x and z (units are metres)
  cell: 50, // terrain grid cell size
  waterLevel: 0,
  viewDistance: 1500, // how far the camera draws terrain
  seed: 20261126,
};

export const PLANE = {
  maxSpeed: 96, // m/s at full throttle, level flight
  stallSpeed: 26, // m/s; below this the wing gives up
  maxRoll: 0.85, // radians of bank — a bush plane that answers quickly
  maxPitch: 0.42, // radians nose up/down
  rollRate: 1.9, // rad/s toward the commanded bank
  pitchRate: 1.4, // rad/s toward the commanded pitch
  throttleRate: 0.55, // per second
  fuelDrain: 0.42, // fuel per second at cruise throttle
  fuelPerRing: 14, // fuel bonus for each ring flown
  ringScore: 100,
  landingScore: 500,
  runway: { x: 0, z: 0, halfLength: 170, halfWidth: 13, height: 2 },
};

export const CAMERA = {
  distance: 17, // metres behind the plane
  height: 4.6, // metres above the plane
  lookAhead: 34, // metres ahead of the plane the camera aims at
  fov: 68, // vertical field of view, degrees
  rollFollow: 0.42, // how much of the plane's bank the camera takes
  smoothing: 5.2, // camera position lerp rate
};

// A ring: a glowing hoop the pilot flies through. `at` is its centre,
// `radius` the hoop radius, `facing` the direction the pilot arrives from.
export const LEVELS = [
  {
    name: 'First Light',
    brief: 'Four wide rings over the lagoon, then land on the strip.',
    sky: 'morning',
    wind: { x: 0, z: 0 },
    fuel: 100,
    ringRadius: 26,
    rings: [
      { at: [0, 72, 420], facing: [0, 0, 1] },
      { at: [330, 72, 760], facing: [0.5, 0, 0.86] },
      { at: [700, 85, 500], facing: [0.94, 0, -0.34] },
      { at: [420, 72, 60], facing: [-0.5, 0, -0.86] },
    ],
  },
  {
    name: 'Island Hop',
    brief: 'Six rings, tighter hoops, a crosswind off the sea.',
    sky: 'noon',
    wind: { x: 4.5, z: 1.5 },
    fuel: 100,
    ringRadius: 21,
    rings: [
      { at: [0, 72, 430], facing: [0, 0, 1] },
      { at: [-380, 72, 700], facing: [-0.55, 0, 0.83] },
      { at: [-820, 90, 350], facing: [-0.97, 0, -0.24] },
      { at: [-650, 80, -350], facing: [0.2, 0, -0.98] },
      { at: [-80, 72, -720], facing: [0.85, 0, -0.53] },
      { at: [300, 72, -420], facing: [0.86, 0, 0.5] },
    ],
  },
  {
    name: 'Sunset Run',
    brief: 'Eight narrow rings into the sunset. Fuel is tight — fly clean.',
    sky: 'sunset',
    wind: { x: 6, z: -2.5 },
    fuel: 95,
    ringRadius: 17,
    rings: [
      { at: [0, 72, 430], facing: [0, 0, 1] },
      { at: [420, 72, 780], facing: [0.6, 0, 0.8] },
      { at: [880, 88, 420], facing: [0.95, 0, -0.3] },
      { at: [760, 85, -300], facing: [-0.2, 0, -0.98] },
      { at: [180, 72, -760], facing: [-0.85, 0, -0.53] },
      { at: [-420, 80, -480], facing: [-0.85, 0, 0.53] },
      { at: [-820, 72, 120], facing: [-0.3, 0, 0.95] },
      { at: [-380, 72, 420], facing: [0.55, 0, 0.86] },
    ],
  },
];

export const SKIES = {
  morning: {
    top: '#2f6fb4', mid: '#7fb2dd', horizon: '#ffd9a0',
    sun: { az: 0.6, el: 0.55, color: '#fff3c4', glow: '#ffe9a8' },
    fog: 'rgba(190, 220, 245, 0.55)',
  },
  noon: {
    top: '#1e63a8', mid: '#5ea3d8', horizon: '#cfe8f5',
    sun: { az: -0.4, el: 1.0, color: '#ffffff', glow: '#fff8d0' },
    fog: 'rgba(200, 225, 245, 0.5)',
  },
  sunset: {
    top: '#3a2a63', mid: '#c65f7e', horizon: '#ff9e56',
    sun: { az: -0.9, el: 0.16, color: '#ffdf8a', glow: '#ff9e56' },
    fog: 'rgba(255, 170, 120, 0.5)',
  },
};
