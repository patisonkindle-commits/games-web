export class Input {
    constructor(canvas) {
        this.canvas = canvas;
        this.touches = new Map();
        this.activeTouch = null; // the primary touch
        this.touchX = 0;
        this.touchY = 0;
        this.touching = false;
        this.justTapped = false;
        this.justReleased = false;

        canvas.addEventListener('touchstart', (e) => this._onTouchStart(e), { passive: false });
        canvas.addEventListener('touchmove', (e) => this._onTouchMove(e), { passive: false });
        canvas.addEventListener('touchend', (e) => this._onTouchEnd(e), { passive: false });
        canvas.addEventListener('touchcancel', (e) => this._onTouchEnd(e), { passive: false });

        // Mouse fallback for desktop testing
        canvas.addEventListener('mousedown', (e) => this._onMouseDown(e));
        canvas.addEventListener('mousemove', (e) => this._onMouseMove(e));
        canvas.addEventListener('mouseup', (e) => this._onMouseUp(e));

        this._mouseDown = false;
        this._mouseJustClicked = false;
    }

    getClientPos(e) {
        const rect = this.canvas.getBoundingClientRect();
        return {
            x: (e.clientX - rect.left) * (this.canvas.width / rect.width),
            y: (e.clientY - rect.top) * (this.canvas.height / rect.height),
        };
    }

    _onTouchStart(e) {
        e.preventDefault();
        for (const touch of e.changedTouches) {
            if (!this.activeTouch) {
                const pos = this.getClientPos(touch);
                this.activeTouch = touch.identifier;
                this.touchX = pos.x;
                this.touchY = pos.y;
                this.touching = true;
                this.justTapped = true;
            }
        }
    }

    _onTouchMove(e) {
        e.preventDefault();
        for (const touch of e.changedTouches) {
            if (touch.identifier === this.activeTouch) {
                const pos = this.getClientPos(touch);
                this.touchX = pos.x;
                this.touchY = pos.y;
            }
        }
    }

    _onTouchEnd(e) {
        e.preventDefault();
        for (const touch of e.changedTouches) {
            if (touch.identifier === this.activeTouch) {
                this.activeTouch = null;
                this.touching = false;
                this.justReleased = true;
            }
        }
    }

    _onMouseDown(e) {
        this._mouseDown = true;
        this._mouseJustClicked = true;
        const pos = this.getClientPos(e);
        this.touchX = pos.x;
        this.touchY = pos.y;
        this.touching = true;
    }

    _onMouseMove(e) {
        if (this._mouseDown) {
            const pos = this.getClientPos(e);
            this.touchX = pos.x;
            this.touchY = pos.y;
        }
    }

    _onMouseUp(e) {
        this._mouseDown = false;
        this.touching = false;
        this.justReleased = true;
    }

    getTouchPos() {
        return { x: this.touchX, y: this.touchY };
    }

    isTouching() {
        return this.touching;
    }

    wasTapped() {
        return this.justTapped;
    }

    postFrame() {
        this.justTapped = false;
        this._mouseJustClicked = false;
        this.justReleased = false;
    }
}
