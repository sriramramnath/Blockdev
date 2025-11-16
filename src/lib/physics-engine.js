/**
 * Physics Engine Integration using Matter.js
 * Provides physics simulation for 2D games
 *
 * FIXED: Enabled sleeping for performance
 */

import Matter from 'matter-js';

class PhysicsEngine {
    constructor() {
        // Create engine with sleeping enabled for performance
        this.engine = Matter.Engine.create({
            enableSleeping: true,
            timing: {
                timeScale: 1
            }
        });

        this.world = this.engine.world;
        this.bodies = new Map(); // spriteId -> body mapping
        this.enabled = false;
        this.gravity = { x: 0, y: 1 };
        this.timeStep = 1000 / 60; // 60 FPS
        this.lastUpdate = Date.now();

        // Configure engine
        this.engine.world.gravity.y = this.gravity.y;
        this.engine.world.gravity.x = this.gravity.x;
    }

    /**
     * Enable physics simulation
     */
    enable() {
        this.enabled = true;
    }

    /**
     * Disable physics simulation
     */
    disable() {
        this.enabled = false;
    }

    /**
     * Set world gravity
     * @param {number} x - Horizontal gravity
     * @param {number} y - Vertical gravity
     */
    setGravity(x, y) {
        x = parseFloat(x);
        y = parseFloat(y);

        if (isNaN(x) || isNaN(y)) {
            console.error('Gravity values must be numbers');
            return;
        }

        this.gravity = { x, y };
        this.world.gravity.x = x;
        this.world.gravity.y = y;
    }

    /**
     * Create a physics body for a sprite
     * @param {string} spriteId - Unique sprite identifier
     * @param {object} options - Body configuration
     * @returns {Matter.Body}
     */
    createBody(spriteId, options = {}) {
        const {
            x = 0,
            y = 0,
            width = 50,
            height = 50,
            shape = 'rectangle',
            mass = 1,
            friction = 0.1,
            restitution = 0.3,
            isStatic = false,
            isSensor = false,
            angle = 0
        } = options;

        let body;

        // Create body based on shape
        switch (shape) {
            case 'circle':
                const radius = Math.max(width, height) / 2;
                body = Matter.Bodies.circle(x, y, radius, {
                    mass,
                    friction,
                    restitution,
                    isStatic,
                    isSensor,
                    angle: angle * (Math.PI / 180),
                    sleepThreshold: 60 // Frames before sleeping
                });
                break;

            case 'polygon':
                const sides = options.sides || 6;
                const polyRadius = Math.max(width, height) / 2;
                body = Matter.Bodies.polygon(x, y, sides, polyRadius, {
                    mass,
                    friction,
                    restitution,
                    isStatic,
                    isSensor,
                    angle: angle * (Math.PI / 180),
                    sleepThreshold: 60
                });
                break;

            case 'rectangle':
            default:
                body = Matter.Bodies.rectangle(x, y, width, height, {
                    mass,
                    friction,
                    restitution,
                    isStatic,
                    isSensor,
                    angle: angle * (Math.PI / 180),
                    sleepThreshold: 60
                });
                break;
        }

        // Store sprite reference
        body.spriteId = spriteId;

        // Add to world
        Matter.World.add(this.world, body);
        this.bodies.set(spriteId, body);

        return body;
    }

    /**
     * Remove physics body for a sprite
     * @param {string} spriteId
     */
    removeBody(spriteId) {
        const body = this.bodies.get(spriteId);
        if (body) {
            Matter.World.remove(this.world, body);
            this.bodies.delete(spriteId);
        }
    }

    /**
     * Apply force to a body
     * @param {string} spriteId
     * @param {number} x - Force X
     * @param {number} y - Force Y
     */
    applyForce(spriteId, x, y) {
        const body = this.bodies.get(spriteId);
        if (!body) {
            console.warn(`Physics body not found for sprite: ${spriteId}`);
            return;
        }

        // Wake up body if sleeping
        Matter.Sleeping.set(body, false);
        Matter.Body.applyForce(body, body.position, {x, y});
    }

    /**
     * Set velocity of a body
     * @param {string} spriteId
     * @param {number} x - Velocity X
     * @param {number} y - Velocity Y
     */
    setVelocity(spriteId, x, y) {
        const body = this.bodies.get(spriteId);
        if (!body) {
            console.warn(`Physics body not found for sprite: ${spriteId}`);
            return;
        }

        // Wake up body if sleeping
        Matter.Sleeping.set(body, false);
        Matter.Body.setVelocity(body, { x, y });
    }

    /**
     * Get velocity of a body
     * @param {string} spriteId
     * @returns {object} Velocity {x, y}
     */
    getVelocity(spriteId) {
        const body = this.bodies.get(spriteId);
        return body ? body.velocity : { x: 0, y: 0 };
    }

    /**
     * Set angular velocity (rotation speed)
     * @param {string} spriteId
     * @param {number} velocity - Angular velocity in radians per engine update
     */
    setAngularVelocity(spriteId, velocity) {
        const body = this.bodies.get(spriteId);
        if (!body) {
            console.warn(`Physics body not found for sprite: ${spriteId}`);
            return;
        }

        // Wake up body if sleeping
        Matter.Sleeping.set(body, false);
        Matter.Body.setAngularVelocity(body, velocity);
    }

    /**
     * Set position of a body
     * @param {string} spriteId
     * @param {number} x
     * @param {number} y
     */
    setPosition(spriteId, x, y) {
        const body = this.bodies.get(spriteId);
        if (body) {
            Matter.Body.setPosition(body, { x, y });
        }
    }

    /**
     * Get position of a body
     * @param {string} spriteId
     * @returns {object} Position {x, y}
     */
    getPosition(spriteId) {
        const body = this.bodies.get(spriteId);
        return body ? body.position : { x: 0, y: 0 };
    }

    /**
     * Set rotation of a body
     * @param {string} spriteId
     * @param {number} angle - Angle in degrees
     */
    setRotation(spriteId, angle) {
        const body = this.bodies.get(spriteId);
        if (body) {
            Matter.Body.setAngle(body, angle * (Math.PI / 180));
        }
    }

    /**
     * Get rotation of a body
     * @param {string} spriteId
     * @returns {number} Angle in degrees
     */
    getRotation(spriteId) {
        const body = this.bodies.get(spriteId);
        return body ? body.angle * (180 / Math.PI) : 0;
    }

    /**
     * Set mass of a body
     * @param {string} spriteId
     * @param {number} mass
     */
    setMass(spriteId, mass) {
        const body = this.bodies.get(spriteId);
        if (body) {
            Matter.Body.setMass(body, parseFloat(mass) || 1);
        }
    }

    /**
     * Set whether body is static (immovable)
     * @param {string} spriteId
     * @param {boolean} isStatic
     */
    setStatic(spriteId, isStatic) {
        const body = this.bodies.get(spriteId);
        if (body) {
            Matter.Body.setStatic(body, Boolean(isStatic));
        }
    }

    /**
     * Check collision between two sprites
     * @param {string} spriteId1
     * @param {string} spriteId2
     * @returns {boolean} True if colliding
     */
    checkCollision(spriteId1, spriteId2) {
        const body1 = this.bodies.get(spriteId1);
        const body2 = this.bodies.get(spriteId2);

        if (!body1 || !body2) return false;

        return Matter.SAT.collides(body1, body2).collided;
    }

    /**
     * Raycast from point to point
     * @param {number} startX
     * @param {number} startY
     * @param {number} endX
     * @param {number} endY
     * @returns {object} Hit information or null
     */
    raycast(startX, startY, endX, endY) {
        const collisions = Matter.Query.ray(
            this.world.bodies,
            { x: startX, y: startY },
            { x: endX, y: endY }
        );

        if (collisions.length > 0) {
            const hit = collisions[0];
            return {
                body: hit,
                spriteId: hit.spriteId,
                point: hit.position
            };
        }

        return null;
    }

    /**
     * Get all bodies in a region
     * @param {number} x
     * @param {number} y
     * @param {number} width
     * @param {number} height
     * @returns {Array} Array of sprite IDs
     */
    queryRegion(x, y, width, height) {
        const bounds = {
            min: { x: x - width / 2, y: y - height / 2 },
            max: { x: x + width / 2, y: y + height / 2 }
        };

        const bodies = Matter.Query.region(this.world.bodies, bounds);
        return bodies.map(body => body.spriteId).filter(id => id);
    }

    /**
     * Update physics simulation
     * @param {number} deltaTime - Time since last update in ms
     */
    update(deltaTime) {
        if (!this.enabled) return;

        // Use fixed time step for consistency
        Matter.Engine.update(this.engine, deltaTime || this.timeStep);
    }

    /**
     * Get all collision pairs in current frame
     * @returns {Array} Array of collision pairs
     */
    getCollisionPairs() {
        const pairs = [];
        const collisions = this.engine.pairs.list;

        for (let i = 0; i < collisions.length; i++) {
            const pair = collisions[i];
            if (pair.isActive) {
                pairs.push({
                    spriteId1: pair.bodyA.spriteId,
                    spriteId2: pair.bodyB.spriteId,
                    bodyA: pair.bodyA,
                    bodyB: pair.bodyB,
                    collision: pair.collision
                });
            }
        }

        return pairs;
    }

    /**
     * Create a constraint (joint) between two bodies
     * @param {string} spriteId1
     * @param {string} spriteId2
     * @param {object} options
     * @returns {Matter.Constraint}
     */
    createConstraint(spriteId1, spriteId2, options = {}) {
        const body1 = this.bodies.get(spriteId1);
        const body2 = this.bodies.get(spriteId2);

        if (!body1 || !body2) return null;

        const constraint = Matter.Constraint.create({
            bodyA: body1,
            bodyB: body2,
            length: options.length || 100,
            stiffness: options.stiffness || 0.5,
            damping: options.damping || 0.1
        });

        Matter.World.add(this.world, constraint);
        return constraint;
    }

    /**
     * Clear all physics bodies
     */
    clear() {
        Matter.World.clear(this.world, false);
        this.bodies.clear();
    }

    /**
     * Reset physics engine
     */
    reset() {
        this.clear();
        this.enabled = false;
        this.engine = Matter.Engine.create({
            enableSleeping: true,
            timing: {
                timeScale: 1
            }
        });
        this.world = this.engine.world;
        this.world.gravity.x = this.gravity.x;
        this.world.gravity.y = this.gravity.y;
    }
}

// Create singleton instance
const physicsEngine = new PhysicsEngine();

export default physicsEngine;
