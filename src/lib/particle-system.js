/**
 * Particle System
 * Object pooling with dynamic growth and built-in presets
 *
 * FIXED: Dynamic pool growth when exhausted
 */

class Particle {
    constructor() {
        this.active = false;
        this.x = 0;
        this.y = 0;
        this.velocityX = 0;
        this.velocityY = 0;
        this.life = 0;
        this.maxLife = 1;
        this.size = 1;
        this.startSize = 1;
        this.endSize = 1;
        this.color = '#ffffff';
        this.startColor = '#ffffff';
        this.endColor = '#ffffff';
        this.alpha = 1;
        this.startAlpha = 1;
        this.endAlpha = 0;
        this.rotation = 0;
        this.angularVelocity = 0;
        this.gravity = 0;
        this.drag = 0;
        this.sprite = null;
    }

    reset() {
        this.active = false;
        this.life = 0;
        this.x = 0;
        this.y = 0;
        this.velocityX = 0;
        this.velocityY = 0;
        this.rotation = 0;
        this.angularVelocity = 0;
        this.size = 0;
        this.alpha = 0;
    }

    update(deltaTime) {
        if (!this.active) return;

        const deltaSeconds = deltaTime / 1000;

        // Update life
        this.life += deltaSeconds;
        if (this.life >= this.maxLife) {
            this.active = false;
            return;
        }

        // Update position
        this.x += this.velocityX * deltaSeconds;
        this.y += this.velocityY * deltaSeconds;

        // Apply gravity
        this.velocityY += this.gravity * deltaSeconds;

        // Apply drag (clamped to prevent velocity reversal)
        const dragFactor = Math.max(0, 1 - this.drag * deltaSeconds);
        this.velocityX *= dragFactor;
        this.velocityY *= dragFactor;

        // Update rotation
        this.rotation += this.angularVelocity * deltaSeconds;

        // Interpolate properties based on life
        const progress = this.life / this.maxLife;

        // Size
        this.size = this.startSize + (this.endSize - this.startSize) * progress;

        // Alpha
        this.alpha = this.startAlpha + (this.endAlpha - this.startAlpha) * progress;

        // FIXED: Color interpolation
        if (this.startColor !== this.endColor) {
            this.color = this._interpolateColor(this.startColor, this.endColor, progress);
        }
    }

    /**
     * Interpolate between two colors
     * @private
     * @param {string} startColor - CSS color (hex or rgb)
     * @param {string} endColor - CSS color (hex or rgb)
     * @param {number} progress - 0 to 1
     * @returns {string} - Interpolated color as rgb()
     */
    _interpolateColor(startColor, endColor, progress) {
        const start = this._parseColor(startColor);
        const end = this._parseColor(endColor);

        if (!start || !end) {
            return startColor; // Fallback if parsing fails
        }

        const r = Math.round(start.r + (end.r - start.r) * progress);
        const g = Math.round(start.g + (end.g - start.g) * progress);
        const b = Math.round(start.b + (end.b - start.b) * progress);

        return `rgb(${r},${g},${b})`;
    }

    /**
     * Parse CSS color to RGB
     * @private
     * @param {string} color - CSS color string
     * @returns {object|null} - {r, g, b} or null if parsing fails
     */
    _parseColor(color) {
        if (!color || typeof color !== 'string') return null;

        // Handle hex colors (#RGB or #RRGGBB)
        if (color.startsWith('#')) {
            let hex = color.substring(1);

            // Expand short hex (#RGB to #RRGGBB)
            if (hex.length === 3) {
                hex = hex.split('').map(c => c + c).join('');
            }

            if (hex.length === 6) {
                return {
                    r: parseInt(hex.substring(0, 2), 16),
                    g: parseInt(hex.substring(2, 4), 16),
                    b: parseInt(hex.substring(4, 6), 16)
                };
            }
        }

        // Handle rgb() or rgba() format
        const rgbMatch = color.match(/rgb\w*\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
        if (rgbMatch) {
            return {
                r: parseInt(rgbMatch[1], 10),
                g: parseInt(rgbMatch[2], 10),
                b: parseInt(rgbMatch[3], 10)
            };
        }

        return null;
    }
}

class ParticleEmitter {
    constructor(id, options = {}) {
        this.id = id;
        this.x = options.x || 0;
        this.y = options.y || 0;
        this.active = true;

        // Emission
        this.emissionRate = options.emissionRate || 10; // particles per second
        this.emissionTime = 0;
        this.burstSize = options.burstSize || 0;
        this.continuous = options.continuous !== undefined ? options.continuous : true;
        this.duration = options.duration || -1; // -1 = infinite
        this.elapsed = 0;

        // Particle properties
        this.particleLife = options.particleLife || { min: 1, max: 2 };
        this.particleSize = options.particleSize || { min: 2, max: 4 };
        this.particleColor = options.particleColor || { start: '#ffffff', end: '#ffffff' };
        this.particleAlpha = options.particleAlpha || { start: 1, end: 0 };
        this.particleVelocity = options.particleVelocity || { min: 50, max: 100 };
        this.particleAngle = options.particleAngle || { min: 0, max: 360 };
        this.particleRotation = options.particleRotation || { min: 0, max: 0 };
        this.particleSprite = options.particleSprite || null;

        // Affectors
        this.gravity = options.gravity || 0;
        this.drag = options.drag || 0;
        this.wind = options.wind || { x: 0, y: 0 };

        // Pool - FIXED: Now grows dynamically
        this.maxParticles = options.maxParticles || 1000;
        this.initialPoolSize = Math.min(100, this.maxParticles);
        this.poolGrowthSize = 50; // Grow by this many when exhausted
        this.particles = [];

        // Initialize pool
        for (let i = 0; i < this.initialPoolSize; i++) {
            this.particles.push(new Particle());
        }
    }

    /**
     * FIXED: Grow particle pool dynamically
     * @private
     */
    growPool() {
        const currentSize = this.particles.length;
        if (currentSize >= this.maxParticles) {
            console.warn(`Particle pool at max capacity: ${this.maxParticles}`);
            return false;
        }

        const growBy = Math.min(this.poolGrowthSize, this.maxParticles - currentSize);
        console.log(`Growing particle pool by ${growBy} (${currentSize} → ${currentSize + growBy})`);

        for (let i = 0; i < growBy; i++) {
            this.particles.push(new Particle());
        }

        return true;
    }

    /**
     * Get random value from range
     * @private
     */
    randomRange(min, max) {
        return min + Math.random() * (max - min);
    }

    /**
     * Emit particles
     * @param {number} count - Number of particles to emit
     */
    emit(count = 1) {
        for (let i = 0; i < count; i++) {
            // Find inactive particle
            let particle = this.particles.find(p => !p.active);

            // FIXED: Grow pool if exhausted
            if (!particle) {
                if (this.growPool()) {
                    // Try again after growing
                    particle = this.particles.find(p => !p.active);
                }
            }

            if (!particle) {
                // Still no particle available (at max capacity)
                break;
            }

            // Initialize particle
            particle.active = true;
            particle.x = this.x;
            particle.y = this.y;
            particle.life = 0;
            particle.maxLife = this.randomRange(this.particleLife.min, this.particleLife.max);

            // Velocity
            const angle = this.randomRange(this.particleAngle.min, this.particleAngle.max) * (Math.PI / 180);
            const speed = this.randomRange(this.particleVelocity.min, this.particleVelocity.max);
            particle.velocityX = Math.cos(angle) * speed + this.wind.x;
            particle.velocityY = Math.sin(angle) * speed + this.wind.y;

            // Size
            particle.startSize = this.randomRange(this.particleSize.min, this.particleSize.max);
            particle.endSize = this.particleSize.end !== undefined ?
                this.randomRange(this.particleSize.end.min || 0, this.particleSize.end.max || 0) :
                particle.startSize * 0.5;
            particle.size = particle.startSize;

            // Color
            particle.startColor = this.particleColor.start;
            particle.endColor = this.particleColor.end;
            particle.color = particle.startColor;

            // Alpha
            particle.startAlpha = this.particleAlpha.start;
            particle.endAlpha = this.particleAlpha.end;
            particle.alpha = particle.startAlpha;

            // Rotation
            particle.rotation = this.randomRange(this.particleRotation.min, this.particleRotation.max);
            particle.angularVelocity = this.randomRange(
                this.particleRotation.velocity?.min || 0,
                this.particleRotation.velocity?.max || 0
            );

            // Affectors
            particle.gravity = this.gravity;
            particle.drag = this.drag;

            // Sprite
            particle.sprite = this.particleSprite;
        }
    }

    /**
     * Emit burst of particles
     * @param {number} count
     */
    burst(count) {
        this.emit(count || this.burstSize);
    }

    /**
     * Update emitter
     * @param {number} deltaTime - ms
     */
    update(deltaTime) {
        if (!this.active) return;

        const deltaSeconds = deltaTime / 1000;

        // Update elapsed time
        if (this.duration > 0) {
            this.elapsed += deltaSeconds;
            if (this.elapsed >= this.duration) {
                this.active = false;
            }
        }

        // Continuous emission
        if (this.continuous && this.active) {
            this.emissionTime += deltaSeconds;
            const interval = 1 / this.emissionRate;

            while (this.emissionTime >= interval) {
                this.emit(1);
                this.emissionTime -= interval;
            }
        }

        // Update particles
        this.particles.forEach(particle => {
            if (particle.active) {
                particle.update(deltaTime);
            }
        });
    }

    /**
     * Set emitter position
     * @param {number} x
     * @param {number} y
     */
    setPosition(x, y) {
        this.x = x;
        this.y = y;
    }

    /**
     * Start emitting
     */
    start() {
        this.active = true;
        this.elapsed = 0;
    }

    /**
     * Stop emitting
     */
    stop() {
        this.active = false;
    }

    /**
     * Clear all particles
     */
    clear() {
        this.particles.forEach(particle => {
            particle.reset();
        });
    }

    /**
     * Get active particle count
     * @returns {number}
     */
    getActiveCount() {
        return this.particles.filter(p => p.active).length;
    }

    /**
     * Get total pool size
     * @returns {number}
     */
    getPoolSize() {
        return this.particles.length;
    }
}

class ParticleSystem {
    constructor() {
        this.emitters = new Map();
    }

    /**
     * Create particle emitter
     * @param {string} emitterId
     * @param {object} options
     * @returns {ParticleEmitter}
     */
    createEmitter(emitterId, options = {}) {
        const emitter = new ParticleEmitter(emitterId, options);
        this.emitters.set(emitterId, emitter);
        return emitter;
    }

    /**
     * Create emitter from preset
     * @param {string} emitterId
     * @param {string} preset - fire, smoke, explosion, rain, snow, sparkle, blood, magic
     * @param {object} position - {x, y}
     * @returns {ParticleEmitter}
     */
    createFromPreset(emitterId, preset, position = { x: 0, y: 0 }) {
        const presets = {
            fire: {
                x: position.x,
                y: position.y,
                emissionRate: 30,
                continuous: true,
                particleLife: { min: 0.5, max: 1.5 },
                particleSize: { min: 3, max: 8, end: { min: 1, max: 3 } },
                particleColor: { start: '#ffaa00', end: '#ff0000' },
                particleAlpha: { start: 1, end: 0 },
                particleVelocity: { min: 20, max: 60 },
                particleAngle: { min: -100, max: -80 },
                gravity: -50,
                drag: 0.5
            },
            smoke: {
                x: position.x,
                y: position.y,
                emissionRate: 15,
                continuous: true,
                particleLife: { min: 2, max: 4 },
                particleSize: { min: 5, max: 15, end: { min: 20, max: 40 } },
                particleColor: { start: '#555555', end: '#222222' },
                particleAlpha: { start: 0.8, end: 0 },
                particleVelocity: { min: 10, max: 30 },
                particleAngle: { min: -100, max: -80 },
                gravity: -20,
                drag: 0.8
            },
            explosion: {
                x: position.x,
                y: position.y,
                continuous: false,
                burstSize: 50,
                particleLife: { min: 0.5, max: 1.5 },
                particleSize: { min: 2, max: 6 },
                particleColor: { start: '#ffaa00', end: '#ff0000' },
                particleAlpha: { start: 1, end: 0 },
                particleVelocity: { min: 100, max: 300 },
                particleAngle: { min: 0, max: 360 },
                gravity: 200,
                drag: 2
            },
            rain: {
                x: position.x,
                y: position.y,
                emissionRate: 100,
                continuous: true,
                particleLife: { min: 1, max: 2 },
                particleSize: { min: 1, max: 2 },
                particleColor: { start: '#aaaaff', end: '#aaaaff' },
                particleAlpha: { start: 0.7, end: 0.3 },
                particleVelocity: { min: 200, max: 300 },
                particleAngle: { min: 85, max: 95 },
                gravity: 500,
                drag: 0
            },
            snow: {
                x: position.x,
                y: position.y,
                emissionRate: 30,
                continuous: true,
                particleLife: { min: 3, max: 6 },
                particleSize: { min: 2, max: 4 },
                particleColor: { start: '#ffffff', end: '#ffffff' },
                particleAlpha: { start: 1, end: 0.3 },
                particleVelocity: { min: 20, max: 50 },
                particleAngle: { min: 80, max: 100 },
                gravity: 30,
                drag: 0.5,
                wind: { x: 10, y: 0 }
            },
            sparkle: {
                x: position.x,
                y: position.y,
                emissionRate: 50,
                continuous: true,
                duration: 1,
                particleLife: { min: 0.3, max: 0.8 },
                particleSize: { min: 1, max: 3 },
                particleColor: { start: '#ffff00', end: '#ffffff' },
                particleAlpha: { start: 1, end: 0 },
                particleVelocity: { min: 30, max: 80 },
                particleAngle: { min: 0, max: 360 },
                gravity: 0,
                drag: 1
            },
            blood: {
                x: position.x,
                y: position.y,
                continuous: false,
                burstSize: 20,
                particleLife: { min: 0.5, max: 1 },
                particleSize: { min: 2, max: 5 },
                particleColor: { start: '#aa0000', end: '#440000' },
                particleAlpha: { start: 1, end: 0 },
                particleVelocity: { min: 80, max: 150 },
                particleAngle: { min: 0, max: 360 },
                gravity: 300,
                drag: 3
            },
            magic: {
                x: position.x,
                y: position.y,
                emissionRate: 40,
                continuous: true,
                particleLife: { min: 1, max: 2 },
                particleSize: { min: 2, max: 6 },
                particleColor: { start: '#aa00ff', end: '#00ffff' },
                particleAlpha: { start: 1, end: 0 },
                particleVelocity: { min: 30, max: 80 },
                particleAngle: { min: 0, max: 360 },
                particleRotation: { min: 0, max: 360, velocity: { min: -180, max: 180 } },
                gravity: -50,
                drag: 0.5
            }
        };

        const presetOptions = presets[preset];
        if (!presetOptions) {
            console.error(`Unknown particle preset: ${preset}`);
            return null;
        }

        const emitter = this.createEmitter(emitterId, presetOptions);

        // Auto-burst for one-shot presets
        if (!presetOptions.continuous && presetOptions.burstSize) {
            emitter.burst();
        }

        return emitter;
    }

    /**
     * Get emitter
     * @param {string} emitterId
     * @returns {ParticleEmitter}
     */
    getEmitter(emitterId) {
        return this.emitters.get(emitterId);
    }

    /**
     * Remove emitter
     * @param {string} emitterId
     */
    removeEmitter(emitterId) {
        const emitter = this.emitters.get(emitterId);
        if (emitter) {
            emitter.clear();
            this.emitters.delete(emitterId);
        }
    }

    /**
     * Update all emitters
     * @param {number} deltaTime
     */
    update(deltaTime) {
        this.emitters.forEach(emitter => {
            emitter.update(deltaTime);
        });
    }

    /**
     * Clear all particles in all emitters
     */
    clear() {
        this.emitters.forEach(emitter => {
            emitter.clear();
        });
        this.emitters.clear();
    }

    /**
     * Get total active particle count
     * @returns {number}
     */
    getTotalActiveParticles() {
        let total = 0;
        this.emitters.forEach(emitter => {
            total += emitter.getActiveCount();
        });
        return total;
    }

    /**
     * Reset system
     */
    reset() {
        this.clear();
    }
}

// Create singleton instance
const particleSystem = new ParticleSystem();

export default particleSystem;
