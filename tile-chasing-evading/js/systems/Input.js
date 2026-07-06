// Input.js — Keyboard + Mouse input manager
export class Input {
  constructor(canvas) {
    this.keys = {};
    this.pressedThisFrame = {};
    this.mouseX = 0;
    this.mouseY = 0;
    this.mouseDown = false;
    this.mouseClickedThisFrame = false;
    this._canvas = canvas;

    window.addEventListener('keydown', (e) => {
      if (!this.keys[e.code]) this.pressedThisFrame[e.code] = true;
      this.keys[e.code] = true;
      if (['Tab','Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code)) {
        e.preventDefault();
      }
    });
    window.addEventListener('keyup', (e) => { this.keys[e.code] = false; });

    const updatePos = (e) => {
      const r = this._canvas.getBoundingClientRect();
      this.mouseX = (e.clientX - r.left) * (this._canvas.width / r.width);
      this.mouseY = (e.clientY - r.top) * (this._canvas.height / r.height);
    };
    canvas.addEventListener('mousemove', updatePos);
    canvas.addEventListener('mousedown', (e) => { updatePos(e); this.mouseDown = true; this.mouseClickedThisFrame = true; });
    canvas.addEventListener('mouseup', () => { this.mouseDown = false; });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  isKeyDown(code)  { return !!this.keys[code]; }
  wasPressed(code) { return !!this.pressedThisFrame[code]; }
  getMousePosition() { return { x: this.mouseX, y: this.mouseY }; }
  wasMouseClicked() { return this.mouseClickedThisFrame; }

  postFrame() {
    this.pressedThisFrame = {};
    this.mouseClickedThisFrame = false;
  }
}
