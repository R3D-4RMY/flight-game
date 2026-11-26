// Sunset Courier — input: keyboard for flying, mouse for steering and
// for the menus. Every frame the game reads a single control vector.

/**
 * Keyboard and mouse input. Keys held are tracked in a set; the mouse
 * steers while its button is held, toward the pointer's offset from the
 * canvas centre.
 */
export class Input {
  constructor(canvas) {
    this.keys = new Set();
    this.mouse = { down: false, x: 0, y: 0 };
    this.pressed = new Set(); // keys pressed since the last frame was read
    this.canvas = canvas;
    window.addEventListener('keydown', (e) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
        e.preventDefault();
      }
      if (!e.repeat) this.pressed.add(e.key);
      this.keys.add(e.key);
    });
    window.addEventListener('keyup', (e) => {
      this.keys.delete(e.key);
    });
    canvas.addEventListener('mousedown', (e) => {
      this.mouse.down = true;
      this.mouse.x = e.clientX;
      this.mouse.y = e.clientY;
    });
    window.addEventListener('mouseup', () => {
      this.mouse.down = false;
    });
    canvas.addEventListener('mousemove', (e) => {
      this.mouse.x = e.clientX;
      this.mouse.y = e.clientY;
    });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  /** Was this key pressed since the last read? Consumes the press. */
  wasPressed(key) {
    if (this.pressed.has(key)) {
      this.pressed.delete(key);
      return true;
    }
    return false;
  }

  /** Clear one-frame presses; called at the end of each frame. */
  endFrame() {
    this.pressed.clear();
  }

  /**
   * The flight control vector for this frame: roll -1..1 (positive banks
   * right), pitch -1..1 (positive climbs), throttle -1..1.
   */
  flightControls() {
    let roll = 0;
    let pitch = 0;
    let throttle = 0;
    if (this.keys.has('ArrowLeft') || this.keys.has('a') || this.keys.has('A')) roll -= 1;
    if (this.keys.has('ArrowRight') || this.keys.has('d') || this.keys.has('D')) roll += 1;
    if (this.keys.has('ArrowUp')) pitch += 1;
    if (this.keys.has('ArrowDown')) pitch -= 1;
    if (this.keys.has('w') || this.keys.has('W')) throttle += 1;
    if (this.keys.has('s') || this.keys.has('S')) throttle -= 1;
    if (this.keys.has('Shift')) throttle += 1;
    if (this.keys.has('Control')) throttle -= 1;
    if (this.keys.has('+') || this.keys.has('=')) throttle += 1;
    if (this.keys.has('-') || this.keys.has('_')) throttle -= 1;
    // Mouse steering: hold the button and the plane banks toward the
    // pointer, climbs when it is above centre, descends when below.
    if (this.mouse.down) {
      const rect = this.canvas.getBoundingClientRect();
      const nx = ((this.mouse.x - rect.left) / rect.width - 0.5) * 2;
      const ny = ((this.mouse.y - rect.top) / rect.height - 0.5) * 2;
      roll += Math.max(-1, Math.min(1, nx * 1.4));
      pitch += Math.max(-1, Math.min(1, -ny * 1.2));
    }
    return {
      roll: Math.max(-1, Math.min(1, roll)),
      pitch: Math.max(-1, Math.min(1, pitch)),
      throttle: Math.max(-1, Math.min(1, throttle)),
    };
  }
}
