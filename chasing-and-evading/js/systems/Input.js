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
      if (!this.keys[e.code]) {
        this.pressedThisFrame[e.code] = true;
      }
      this.keys[e.code] = true;
      // Prevent default for game keys
      if (['Tab', 'Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
        e.preventDefault();
      }
    });

    window.addEventListener('keyup', (e) => {
      this.keys[e.code] = false;
    });

    const updateMousePos = (e) => {
      const rect = this._canvas.getBoundingClientRect();
      const scaleX = this._canvas.width / rect.width;
      const scaleY = this._canvas.height / rect.height;
      this.mouseX = (e.clientX - rect.left) * scaleX;
      this.mouseY = (e.clientY - rect.top) * scaleY;
    };

    canvas.addEventListener('mousemove', (e) => {
      updateMousePos(e);
    });

    canvas.addEventListener('mousedown', (e) => {
      updateMousePos(e);
      this.mouseDown = true;
      this.mouseClickedThisFrame = true;
    });

    canvas.addEventListener('mouseup', () => {
      this.mouseDown = false;
    });

    // Prevent context menu on right-click
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  isKeyDown(code) {
    return !!this.keys[code];
  }

  wasPressed(code) {
    return !!this.pressedThisFrame[code];
  }

  isMouseDown() {
    return this.mouseDown;
  }

  wasMouseClicked() {
    return this.mouseClickedThisFrame;
  }

  getMousePosition() {
    return { x: this.mouseX, y: this.mouseY };
  }

  postFrame() {
    this.pressedThisFrame = {};
    this.mouseClickedThisFrame = false;
  }
}
