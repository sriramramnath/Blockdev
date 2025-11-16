/**
 * Camera System
 * Handles camera follow, zoom, shake, pan, and parallax
 *
 * FIXED: Bounds clamping before smoothing to prevent jitter
 */

class CameraSystem {
    constructor() {
        this.x = 0;
        this.y = 0;
        this.zoom = 1.0;
        this.rotation = 0;

        // Follow settings
        this.followTarget = null;
        this.followSmoothing = 0.1;
        this.followOffset = { x: 0, y: 0 };

        // Bounds
        this.hasBounds = false;
        this.bounds = {
            minX: 0,
            maxX: 0,
            minY: 0,
            maxY: 0
        };

        // Zoom settings
        this.minZoom = 0.1;
        this.maxZoom = 10;
        this.zoomSmoothing = 0.1;
        this.targetZoom = 1.0;

        // Shake effect
        this.shaking = false;
        this.shakeIntensity = 0;
        this.shakeDuration = 0;
        this.shakeTime = 0;
        this.shakeOffset = { x: 0, y: 0 };

        // Tween/Pan
        this.tweening = false;
        this.tweenStart = { x: 0, y: 0 };
        this.tweenEnd = { x: 0, y: 0 };
        this.tweenProgress = 0;
        this.tweenDuration = 1000;
        this.tweenEasing = this.easeInOutQuad;

        // Parallax layers
        this.parallaxLayers = new Map();
    }

    /**
     * Set camera position
     * @param {number} x
     * @param {number} y
     */
    setPosition(x, y) {
        this.x = x;
        this.y = y;
    }

    /**
     * Move camera relative to current position
     * @param {number} dx
     * @param {number} dy
     */
    move(dx, dy) {
        this.x += dx;
        this.y += dy;
        this.clampToBounds();
    }

    /**
     * Set camera zoom
     * @param {number} zoom
     */
    setZoom(zoom) {
        this.zoom = Math.max(this.minZoom, Math.min(this.maxZoom, zoom));
        this.targetZoom = this.zoom;
    }

    /**
     * Set target zoom (smooth)
     * @param {number} zoom
     */
    setTargetZoom(zoom) {
        this.targetZoom = Math.max(this.minZoom, Math.min(this.maxZoom, zoom));
    }

    /**
     * Zoom in/out relative to current
     * @param {number} amount
     */
    zoom(amount) {
        this.setTargetZoom(this.zoom + amount);
    }

    /**
     * Set zoom limits
     * @param {number} min
     * @param {number} max
     */
    setZoomLimits(min, max) {
        this.minZoom = min;
        this.maxZoom = max;
        this.zoom = Math.max(min, Math.min(max, this.zoom));
        this.targetZoom = Math.max(min, Math.min(max, this.targetZoom));
    }

    /**
     * Follow a target sprite
     * @param {object} target - Target with x, y properties
     * @param {number} smoothing - 0 (instant) to 1 (very slow)
     * @param {object} offset - {x, y} offset from target
     */
    follow(target, smoothing = 0.1, offset = { x: 0, y: 0 }) {
        this.followTarget = target;
        this.followSmoothing = Math.max(0, Math.min(1, smoothing));
        this.followOffset = offset;
    }

    /**
     * Stop following target
     */
    stopFollow() {
        this.followTarget = null;
    }

    /**
     * Set camera bounds
     * @param {number} minX
     * @param {number} maxX
     * @param {number} minY
     * @param {number} maxY
     */
    setBounds(minX, maxX, minY, maxY) {
        this.hasBounds = true;
        this.bounds = { minX, maxX, minY, maxY };
        this.clampToBounds();
    }

    /**
     * Remove camera bounds
     */
    clearBounds() {
        this.hasBounds = false;
    }

    /**
     * FIXED: Clamp camera to bounds
     */
    clampToBounds() {
        if (!this.hasBounds) return;

        this.x = Math.max(this.bounds.minX, Math.min(this.bounds.maxX, this.x));
        this.y = Math.max(this.bounds.minY, Math.min(this.bounds.maxY, this.y));
    }

    /**
     * Shake camera
     * @param {number} intensity - Shake intensity in pixels
     * @param {number} duration - Duration in seconds
     */
    shake(intensity, duration) {
        this.shaking = true;
        this.shakeIntensity = intensity;
        this.shakeDuration = duration * 1000; // Convert to ms
        this.shakeTime = 0;
    }

    /**
     * Stop shaking
     */
    stopShake() {
        this.shaking = false;
        this.shakeOffset = { x: 0, y: 0 };
    }

    /**
     * Pan/tween camera to position
     * @param {number} x
     * @param {number} y
     * @param {number} duration - Duration in milliseconds
     * @param {function} easing - Easing function
     * @returns {Promise}
     */
    panTo(x, y, duration = 1000, easing = null) {
        return new Promise((resolve, reject) => {
            // FIXED: Reject previous tween if active
            if (this.tweening && this.tweenCallback) {
                this.tweenCallback();
                this.tweenCallback = null;
            }

            this.tweening = true;
            this.tweenStart = { x: this.x, y: this.y };
            this.tweenEnd = { x, y };
            this.tweenProgress = 0;
            this.tweenDuration = duration;
            this.tweenEasing = easing || this.easeInOutQuad;
            this.tweenCallback = resolve;
        });
    }

    /**
     * Add parallax layer
     * @param {string} layerId
     * @param {number} scrollFactorX - 0 = no movement, 1 = same as camera
     * @param {number} scrollFactorY
     */
    addParallaxLayer(layerId, scrollFactorX, scrollFactorY) {
        this.parallaxLayers.set(layerId, {
            scrollFactorX,
            scrollFactorY
        });
    }

    /**
     * Remove parallax layer
     * @param {string} layerId
     */
    removeParallaxLayer(layerId) {
        this.parallaxLayers.delete(layerId);
    }

    /**
     * Get parallax offset for a layer
     * @param {string} layerId
     * @returns {object} {x, y}
     */
    getParallaxOffset(layerId) {
        const layer = this.parallaxLayers.get(layerId);
        if (!layer) return { x: this.x, y: this.y };

        return {
            x: this.x * layer.scrollFactorX,
            y: this.y * layer.scrollFactorY
        };
    }

    /**
     * Convert world coordinates to screen coordinates
     * @param {number} worldX
     * @param {number} worldY
     * @returns {object} {x, y}
     */
    worldToScreen(worldX, worldY) {
        const finalX = this.x + this.shakeOffset.x;
        const finalY = this.y + this.shakeOffset.y;

        return {
            x: (worldX - finalX) * this.zoom,
            y: (worldY - finalY) * this.zoom
        };
    }

    /**
     * Convert screen coordinates to world coordinates
     * @param {number} screenX
     * @param {number} screenY
     * @returns {object} {x, y}
     */
    screenToWorld(screenX, screenY) {
        const finalX = this.x + this.shakeOffset.x;
        const finalY = this.y + this.shakeOffset.y;

        return {
            x: (screenX / this.zoom) + finalX,
            y: (screenY / this.zoom) + finalY
        };
    }

    /**
     * Check if world position is visible on screen
     * @param {number} x
     * @param {number} y
     * @param {number} margin - Extra margin in pixels (screen space)
     * @param {number} screenWidth
     * @param {number} screenHeight
     * @returns {boolean}
     */
    isVisible(x, y, margin = 0, screenWidth = 480, screenHeight = 360) {
        const screen = this.worldToScreen(x, y);

        // FIXED: Keep margin in screen space (don't divide by zoom)
        return screen.x >= -margin &&
               screen.x <= screenWidth + margin &&
               screen.y >= -margin &&
               screen.y <= screenHeight + margin;
    }

    /**
     * Update camera (called every frame)
     * @param {number} deltaTime - Time since last update in ms
     */
    update(deltaTime) {
        const deltaSeconds = deltaTime / 1000;

        // Update follow
        if (this.followTarget) {
            // FIXED: Clamp target before smoothing to prevent jitter
            let targetX = this.followTarget.x + this.followOffset.x;
            let targetY = this.followTarget.y + this.followOffset.y;

            // Apply bounds to target first
            if (this.hasBounds) {
                targetX = Math.max(this.bounds.minX, Math.min(this.bounds.maxX, targetX));
                targetY = Math.max(this.bounds.minY, Math.min(this.bounds.maxY, targetY));
            }

            // Then smooth to clamped target
            this.x += (targetX - this.x) * this.followSmoothing;
            this.y += (targetY - this.y) * this.followSmoothing;
        }

        // Update tween/pan
        if (this.tweening) {
            this.tweenProgress += deltaTime;
            const t = Math.min(this.tweenProgress / this.tweenDuration, 1);
            const eased = this.tweenEasing(t);

            let targetX = this.tweenStart.x + (this.tweenEnd.x - this.tweenStart.x) * eased;
            let targetY = this.tweenStart.y + (this.tweenEnd.y - this.tweenStart.y) * eased;

            // FIXED: Clamp to bounds if enabled
            if (this.hasBounds) {
                targetX = Math.max(this.bounds.minX, Math.min(this.bounds.maxX, targetX));
                targetY = Math.max(this.bounds.minY, Math.min(this.bounds.maxY, targetY));
            }

            this.x = targetX;
            this.y = targetY;

            if (t >= 1) {
                this.tweening = false;
                if (this.tweenCallback) {
                    this.tweenCallback();
                    this.tweenCallback = null;
                }
            }
        }

        // Clamp to bounds (if not following or tweening, which already handle bounds)
        if (!this.followTarget && !this.tweening) {
            this.clampToBounds();
        }

        // Update zoom smoothing
        if (Math.abs(this.targetZoom - this.zoom) > 0.001) {
            this.zoom += (this.targetZoom - this.zoom) * this.zoomSmoothing;
        }

        // Update shake
        if (this.shaking) {
            this.shakeTime += deltaTime;
            const progress = this.shakeTime / this.shakeDuration;

            if (progress >= 1) {
                this.stopShake();
            } else {
                // Decay shake over time
                const decay = 1 - progress;
                const currentIntensity = this.shakeIntensity * decay;

                // Random offset
                this.shakeOffset.x = (Math.random() - 0.5) * 2 * currentIntensity;
                this.shakeOffset.y = (Math.random() - 0.5) * 2 * currentIntensity;
            }
        }
    }

    /**
     * Get current camera position (including shake)
     * @returns {object} {x, y}
     */
    getPosition() {
        return {
            x: this.x + this.shakeOffset.x,
            y: this.y + this.shakeOffset.y
        };
    }

    /**
     * Get zoom level
     * @returns {number}
     */
    getZoom() {
        return this.zoom;
    }

    /**
     * Easing functions
     */
    easeLinear(t) {
        return t;
    }

    easeInQuad(t) {
        return t * t;
    }

    easeOutQuad(t) {
        return t * (2 - t);
    }

    easeInOutQuad(t) {
        return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
    }

    easeInCubic(t) {
        return t * t * t;
    }

    easeOutCubic(t) {
        return (--t) * t * t + 1;
    }

    easeInOutCubic(t) {
        return t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1;
    }

    /**
     * Reset camera
     */
    reset() {
        this.x = 0;
        this.y = 0;
        this.zoom = 1.0;
        this.rotation = 0;
        this.targetZoom = 1.0;

        this.followTarget = null;
        this.stopShake();
        this.tweening = false;

        this.hasBounds = false;
        this.parallaxLayers.clear();
    }

    /**
     * Clear all settings
     */
    clear() {
        this.reset();
    }
}

// Create singleton instance
const cameraSystem = new CameraSystem();

export default cameraSystem;
