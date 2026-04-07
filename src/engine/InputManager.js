export class InputManager {
  constructor(canvas) {
    this.canvas = canvas;
    this.keys = {};
    this.keysJustPressed = {};
    this.keysJustReleased = {};
    this.mouse = { x: 0, y: 0, dx: 0, dy: 0 };
    this.mouseButtons = {};
    this.isPointerLocked = false;
    this._wantPointerLock = false;
    this._prevKeys = {};

    window.addEventListener('keydown', (e) => {
      this.keys[e.code] = true;
    });

    window.addEventListener('keyup', (e) => {
      this.keys[e.code] = false;
    });

    canvas.addEventListener('mousedown', (e) => {
      this.mouseButtons[e.button] = true;
    });

    canvas.addEventListener('mouseup', (e) => {
      this.mouseButtons[e.button] = false;
    });

    canvas.addEventListener('mousemove', (e) => {
      if (this.isPointerLocked) {
        this.mouse.dx += e.movementX;
        this.mouse.dy += e.movementY;
      }
      this.mouse.x = e.clientX;
      this.mouse.y = e.clientY;
    });

    canvas.addEventListener('click', () => {
      if (!this.isPointerLocked && this._wantPointerLock) {
        canvas.requestPointerLock();
      }
    });

    document.addEventListener('pointerlockchange', () => {
      this.isPointerLocked = document.pointerLockElement === canvas;
    });
  }

  enablePointerLock() {
    this._wantPointerLock = true;
  }

  disablePointerLock() {
    this._wantPointerLock = false;
    if (this.isPointerLocked) {
      document.exitPointerLock();
    }
  }

  isDown(code) {
    return !!this.keys[code];
  }

  justPressed(code) {
    return !!this.keysJustPressed[code];
  }

  justReleased(code) {
    return !!this.keysJustReleased[code];
  }

  getAxis(negCode, posCode) {
    return (this.isDown(posCode) ? 1 : 0) - (this.isDown(negCode) ? 1 : 0);
  }

  getMouseDelta() {
    return { x: this.mouse.dx, y: this.mouse.dy };
  }

  update() {
    for (const code in this.keys) {
      this.keysJustPressed[code] = this.keys[code] && !this._prevKeys[code];
      this.keysJustReleased[code] = !this.keys[code] && this._prevKeys[code];
    }
    this._prevKeys = { ...this.keys };
    this.mouse.dx = 0;
    this.mouse.dy = 0;
  }
}
