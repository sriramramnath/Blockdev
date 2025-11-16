/**
 * Collision Detection System
 * Handles layer-based collisions, triggers, and callbacks
 *
 * NOTE: Uses O(n²) algorithm - spatial hashing recommended for 100+ sprites
 */

class CollisionSystem {
    constructor() {
        this.layers = new Map();
        this.collisionMatrix = new Map();
        this.triggers = new Map();
        this.activeCollisions = new Set();
        this.previousCollisions = new Set();
        this.collisionCallbacks = new Map();
    }

    /**
     * Create a collision layer
     * @param {string} layerId - Layer identifier
     */
    createLayer(layerId) {
        if (!this.layers.has(layerId)) {
            this.layers.set(layerId, new Set());
            this.collisionMatrix.set(layerId, new Set());
        }
    }

    /**
     * Set which layers can collide with each other
     * @param {string} layerId1
     * @param {string} layerId2
     * @param {boolean} canCollide
     */
    setLayerCollision(layerId1, layerId2, canCollide = true) {
        this.createLayer(layerId1);
        this.createLayer(layerId2);

        if (canCollide) {
            this.collisionMatrix.get(layerId1).add(layerId2);
            this.collisionMatrix.get(layerId2).add(layerId1);
        } else {
            this.collisionMatrix.get(layerId1).delete(layerId2);
            this.collisionMatrix.get(layerId2).delete(layerId1);
        }
    }

    /**
     * Add sprite to collision layer
     * @param {string} spriteId
     * @param {string} layerId
     */
    addToLayer(spriteId, layerId) {
        this.createLayer(layerId);
        this.layers.get(layerId).add(spriteId);
    }

    /**
     * Remove sprite from all layers
     * @param {string} spriteId
     */
    removeFromLayers(spriteId) {
        this.layers.forEach(layer => {
            layer.delete(spriteId);
        });

        this.triggers.delete(spriteId);

        // Clean up callbacks
        this.collisionCallbacks.delete(spriteId);
    }

    /**
     * Create a trigger zone (non-physical collision detection)
     * @param {string} triggerId
     * @param {object} shape - {type: 'circle'|'aabb', ...properties}
     * @param {function} onEnter - Callback when sprite enters
     * @param {function} onStay - Callback while sprite inside
     * @param {function} onExit - Callback when sprite leaves
     */
    createTrigger(triggerId, shape, onEnter = null, onStay = null, onExit = null) {
        this.triggers.set(triggerId, {
            shape,
            onEnter,
            onStay,
            onExit,
            currentSprites: new Set(),
            previousSprites: new Set()
        });
    }

    /**
     * Remove trigger
     * @param {string} triggerId
     */
    removeTrigger(triggerId) {
        this.triggers.delete(triggerId);
    }

    /**
     * Set collision callbacks for a sprite
     * @param {string} spriteId
     * @param {object} callbacks - {onEnter, onStay, onExit}
     */
    setCollisionCallbacks(spriteId, callbacks) {
        this.collisionCallbacks.set(spriteId, {
            onEnter: callbacks.onEnter || null,
            onStay: callbacks.onStay || null,
            onExit: callbacks.onExit || null,
            currentCollisions: new Set(),
            previousCollisions: new Set()
        });
    }

    /**
     * Check AABB collision
     * @param {object} bounds1 - {left, right, top, bottom}
     * @param {object} bounds2
     * @returns {boolean}
     */
    checkAABB(bounds1, bounds2) {
        return bounds1.left < bounds2.right &&
               bounds1.right > bounds2.left &&
               bounds1.top < bounds2.bottom &&
               bounds1.bottom > bounds2.top;
    }

    /**
     * Check circle collision
     * @param {number} x1
     * @param {number} y1
     * @param {number} r1
     * @param {number} x2
     * @param {number} y2
     * @param {number} r2
     * @returns {boolean}
     */
    checkCircle(x1, y1, r1, x2, y2, r2) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        const distance = Math.sqrt(dx * dx + dy * dy);
        return distance < (r1 + r2);
    }

    /**
     * Check point in AABB
     * @param {number} px
     * @param {number} py
     * @param {object} bounds - {left, right, top, bottom}
     * @returns {boolean}
     */
    pointInAABB(px, py, bounds) {
        return px >= bounds.left &&
               px <= bounds.right &&
               py >= bounds.top &&
               py <= bounds.bottom;
    }

    /**
     * Check point in circle
     * @param {number} px
     * @param {number} py
     * @param {number} cx
     * @param {number} cy
     * @param {number} radius
     * @returns {boolean}
     */
    pointInCircle(px, py, cx, cy, radius) {
        const dx = px - cx;
        const dy = py - cy;
        return (dx * dx + dy * dy) <= (radius * radius);
    }

    /**
     * Check collisions between all sprites
     * O(n²) - spatial hashing recommended for large sprite counts
     * @param {Map} spriteDataCache - Map of sprite data from game engine
     */
    checkCollisions(spriteDataCache) {
        this.previousCollisions = new Set(this.activeCollisions);
        this.activeCollisions.clear();

        // Check each layer against compatible layers
        this.layers.forEach((spriteIds, layerId) => {
            const compatibleLayers = this.collisionMatrix.get(layerId);
            if (!compatibleLayers || compatibleLayers.size === 0) return;

            // Check against each compatible layer
            compatibleLayers.forEach(otherLayerId => {
                const otherSpriteIds = this.layers.get(otherLayerId);
                if (!otherSpriteIds) return;

                // Check all sprites in this layer against all sprites in other layer
                spriteIds.forEach(spriteId1 => {
                    const sprite1 = spriteDataCache.get(spriteId1);
                    if (!sprite1 || !sprite1.visible) return;

                    otherSpriteIds.forEach(spriteId2 => {
                        // Don't check same sprite
                        if (spriteId1 === spriteId2) return;

                        // Don't check same pair twice
                        const pairId = spriteId1 < spriteId2 ?
                            `${spriteId1}:${spriteId2}` :
                            `${spriteId2}:${spriteId1}`;

                        if (this.activeCollisions.has(pairId)) return;

                        const sprite2 = spriteDataCache.get(spriteId2);
                        if (!sprite2 || !sprite2.visible) return;

                        // Check collision
                        if (this.checkAABB(sprite1.bounds, sprite2.bounds)) {
                            this.activeCollisions.add(pairId);
                            this.handleCollisionPair(spriteId1, spriteId2, sprite1, sprite2);
                        }
                    });
                });
            });
        });

        // Handle collision exits
        this.previousCollisions.forEach(pairId => {
            if (!this.activeCollisions.has(pairId)) {
                const [spriteId1, spriteId2] = pairId.split(':');
                this.handleCollisionExit(spriteId1, spriteId2);
            }
        });
    }

    /**
     * Handle collision between two sprites
     * @private
     */
    handleCollisionPair(spriteId1, spriteId2, sprite1, sprite2) {
        const pairId = spriteId1 < spriteId2 ?
            `${spriteId1}:${spriteId2}` :
            `${spriteId2}:${spriteId1}`;

        const isNewCollision = !this.previousCollisions.has(pairId);

        // Handle callbacks for sprite1
        const callbacks1 = this.collisionCallbacks.get(spriteId1);
        if (callbacks1) {
            if (isNewCollision && callbacks1.onEnter) {
                callbacks1.onEnter(spriteId2, sprite2);
            }
            if (callbacks1.onStay) {
                callbacks1.onStay(spriteId2, sprite2);
            }
            callbacks1.currentCollisions.add(spriteId2);
        }

        // Handle callbacks for sprite2
        const callbacks2 = this.collisionCallbacks.get(spriteId2);
        if (callbacks2) {
            if (isNewCollision && callbacks2.onEnter) {
                callbacks2.onEnter(spriteId1, sprite1);
            }
            if (callbacks2.onStay) {
                callbacks2.onStay(spriteId1, sprite1);
            }
            callbacks2.currentCollisions.add(spriteId1);
        }
    }

    /**
     * Handle collision exit
     * @private
     */
    handleCollisionExit(spriteId1, spriteId2) {
        const callbacks1 = this.collisionCallbacks.get(spriteId1);
        if (callbacks1) {
            if (callbacks1.onExit) {
                callbacks1.onExit(spriteId2);
            }
            callbacks1.currentCollisions.delete(spriteId2);
        }

        const callbacks2 = this.collisionCallbacks.get(spriteId2);
        if (callbacks2) {
            if (callbacks2.onExit) {
                callbacks2.onExit(spriteId1);
            }
            callbacks2.currentCollisions.delete(spriteId1);
        }
    }

    /**
     * Update trigger zones
     * @param {Map} spriteDataCache
     */
    updateTriggers(spriteDataCache) {
        this.triggers.forEach((trigger, triggerId) => {
            // Save previous frame's sprites
            trigger.previousSprites = new Set(trigger.currentSprites);
            trigger.currentSprites.clear();

            // Check each sprite against trigger
            spriteDataCache.forEach((spriteData, spriteId) => {
                if (!spriteData.visible) return;

                let inside = false;

                // Check based on trigger shape
                if (trigger.shape.type === 'circle') {
                    inside = this.checkCircle(
                        spriteData.x, spriteData.y, spriteData.radius,
                        trigger.shape.x, trigger.shape.y, trigger.shape.radius
                    );
                } else if (trigger.shape.type === 'aabb') {
                    inside = this.checkAABB(spriteData.bounds, {
                        left: trigger.shape.x - trigger.shape.width / 2,
                        right: trigger.shape.x + trigger.shape.width / 2,
                        top: trigger.shape.y - trigger.shape.height / 2,
                        bottom: trigger.shape.y + trigger.shape.height / 2
                    });
                }

                if (inside) {
                    trigger.currentSprites.add(spriteId);

                    // Check if just entered
                    if (!trigger.previousSprites.has(spriteId)) {
                        if (trigger.onEnter) {
                            trigger.onEnter(spriteId, spriteData);
                        }
                    } else {
                        // Still inside
                        if (trigger.onStay) {
                            trigger.onStay(spriteId, spriteData);
                        }
                    }
                }
            });

            // Check for exits
            trigger.previousSprites.forEach(spriteId => {
                if (!trigger.currentSprites.has(spriteId)) {
                    if (trigger.onExit) {
                        trigger.onExit(spriteId);
                    }
                }
            });
        });
    }

    /**
     * Check if specific sprite is colliding with any others
     * @param {string} spriteId
     * @returns {Array} Array of colliding sprite IDs
     */
    getCollisions(spriteId) {
        const callbacks = this.collisionCallbacks.get(spriteId);
        if (!callbacks) return [];

        return Array.from(callbacks.currentCollisions);
    }

    /**
     * Check if two specific sprites are colliding
     * @param {string} spriteId1
     * @param {string} spriteId2
     * @returns {boolean}
     */
    areColliding(spriteId1, spriteId2) {
        const pairId = spriteId1 < spriteId2 ?
            `${spriteId1}:${spriteId2}` :
            `${spriteId2}:${spriteId1}`;

        return this.activeCollisions.has(pairId);
    }

    /**
     * Get all sprites in a trigger
     * @param {string} triggerId
     * @returns {Array}
     */
    getSpritesInTrigger(triggerId) {
        const trigger = this.triggers.get(triggerId);
        if (!trigger) return [];

        return Array.from(trigger.currentSprites);
    }

    /**
     * Clear all collision data
     */
    clear() {
        this.layers.clear();
        this.collisionMatrix.clear();
        this.triggers.clear();
        this.activeCollisions.clear();
        this.previousCollisions.clear();
        this.collisionCallbacks.clear();
    }

    /**
     * Reset system
     */
    reset() {
        this.clear();
    }
}

// Create singleton instance
const collisionSystem = new CollisionSystem();

export default collisionSystem;
