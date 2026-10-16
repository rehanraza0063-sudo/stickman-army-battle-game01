// Side-scrolling Camera with parallax, smooth damping, screen shake, and input handling
export class Camera {
  constructor(viewportWidth, viewportHeight, worldWidth) {
    this.viewportWidth = viewportWidth;
    this.viewportHeight = viewportHeight;
    this.worldWidth = worldWidth;
    this.x = 0;
    this.targetX = 0;
    this.speed = 900; // pixels per second
    this.trauma = 0; // for screen shake (0 to 1)
    this.shakeX = 0;
    this.shakeY = 0;
    this.isDragging = false;
    this.dragStartX = 0;
    this.cameraStartX = 0;
  }

  resize(viewportWidth, viewportHeight) {
    this.viewportWidth = viewportWidth;
    this.viewportHeight = viewportHeight;
    this.clamp();
  }

  setWorldWidth(width) {
    this.worldWidth = width;
    this.clamp();
  }

  clamp() {
    const maxX = Math.max(0, this.worldWidth - this.viewportWidth);
    this.targetX = Math.max(0, Math.min(maxX, this.targetX));
    this.x = Math.max(0, Math.min(maxX, this.x));
  }

  pan(deltaX) {
    this.targetX += deltaX;
    this.clamp();
  }

  centerOn(worldX) {
    this.targetX = worldX - this.viewportWidth / 2;
    this.clamp();
  }

  addTrauma(amount = 0.4) {
    this.trauma = Math.min(1.0, this.trauma + amount);
  }

  update(dt, inputKeys) {
    // Keyboard panning (A/D, Left/Right)
    let moveDir = 0;
    if (inputKeys['ArrowLeft'] || inputKeys['KeyA']) moveDir -= 1;
    if (inputKeys['ArrowRight'] || inputKeys['KeyD']) moveDir += 1;

    if (moveDir !== 0) {
      this.targetX += moveDir * this.speed * dt;
      this.clamp();
    }

    // Smooth interpolation towards targetX
    const lerpFactor = 1 - Math.exp(-14 * dt);
    this.x += (this.targetX - this.x) * lerpFactor;

    // Screen shake calculation
    if (this.trauma > 0) {
      const shakePower = Math.pow(this.trauma, 2);
      this.shakeX = (Math.random() * 2 - 1) * 22 * shakePower;
      this.shakeY = (Math.random() * 2 - 1) * 14 * shakePower;
      this.trauma = Math.max(0, this.trauma - dt * 1.5);
    } else {
      this.shakeX = 0;
      this.shakeY = 0;
    }
  }

  // Convert screen coordinates to world coordinates
  screenToWorld(screenX) {
    return screenX + this.x;
  }

  // Convert world coordinates to screen coordinates
  worldToScreen(worldX) {
    return worldX - this.x + this.shakeX;
  }

  // Check if a world horizontal range is visible on screen
  isVisible(worldX, width = 100) {
    return worldX + width >= this.x - 50 && worldX <= this.x + this.viewportWidth + 50;
  }
}
