// Input.js — Keyboard + Mouse + Touch input manager
export class Input {
  constructor(canvas) {
    this.keys = {};
    this.pressedThisFrame = {};
    this.mouseX = 0;
    this.mouseY = 0;
    this.mouseDown = false;
    this.mouseClickedThisFrame = false;
    this._canvas = canvas;

    // ─── Keyboard ───
    window.addEventListener('keydown', (e) => {
      if (!this.keys[e.code]) {
        this.pressedThisFrame[e.code] = true;
      }
      this.keys[e.code] = true;
      // Prevent default for game keys
      if (['Tab', 'Space', 'KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
        e.preventDefault();
      }
    });

    window.addEventListener('keyup', (e) => {
      this.keys[e.code] = false;
    });

    // ─── Coordinate mapper ───
    const mapCoords = (clientX, clientY) => {
      const rect = this._canvas.getBoundingClientRect();
      const scaleX = this._canvas.width / rect.width;
      const scaleY = this._canvas.height / rect.height;
      this.mouseX = (clientX - rect.left) * scaleX;
      this.mouseY = (clientY - rect.top) * scaleY;
    };

    // ─── Mouse events (desktop) ───
    canvas.addEventListener('mousemove', (e) => {
      mapCoords(e.clientX, e.clientY);
    });

    canvas.addEventListener('mousedown', (e) => {
      mapCoords(e.clientX, e.clientY);
      this.mouseDown = true;
      this.mouseClickedThisFrame = true;
    });

    canvas.addEventListener('mouseup', () => {
      this.mouseDown = false;
    });

    // ─── Touch events (mobile) ───
    canvas.addEventListener('touchstart', (e) => {
      e.preventDefault(); // prevent scroll/zoom
      const touch = e.touches[0];
      if (touch) {
        mapCoords(touch.clientX, touch.clientY);
        this.mouseDown = true;
        this.mouseClickedThisFrame = true;
      }
    }, { passive: false });

    canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      const touch = e.touches[0];
      if (touch) {
        mapCoords(touch.clientX, touch.clientY);
      }
    }, { passive: false });

    canvas.addEventListener('touchend', (e) => {
      e.preventDefault();
      this.mouseDown = false;
    }, { passive: false });

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
