// Input.js — Keyboard + Mouse input manager
export class Input {
  constructor(canvas) {
    this.keys = {};
    this.pressedThisFrame = {};
    this._canvas = canvas;

    window.addEventListener('keydown', (e) => {
      if (!this.keys[e.code]) this.pressedThisFrame[e.code] = true;
      this.keys[e.code] = true;
      if (['Tab','Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code)) {
        e.preventDefault();
      }
    });
    window.addEventListener('keyup', (e) => { this.keys[e.code] = false; });
  }

  isKeyDown(code)  { return !!this.keys[code]; }
  wasPressed(code) { return !!this.pressedThisFrame[code]; }

  postFrame() { this.pressedThisFrame = {}; }
}
