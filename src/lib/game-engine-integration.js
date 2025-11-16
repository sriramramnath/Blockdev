/**
 * Game Engine Integration with Scratch VM
 * Connects all game systems to the Scratch runtime
 */

import physicsEngine from './physics-engine';
import collisionSystem from './collision-system';
import cameraSystem from './camera-system';
import sceneManager from './scene-manager';
import animationSystem from './animation-system';
import audioSystem from './audio-system';
import tilemapSystem from './tilemap-system';
import particleSystem from './particle-system';

class GameEngineIntegration {
    constructor() {
        this.vm = null;
        this.initialized = false;
        this.lastUpdateTime = Date.now();
        this.spriteDataCache = new Map();
    }

    /**
     * Initialize game engine with Scratch VM
     * @param {object} vm - Scratch Virtual Machine instance
     */
    initialize(vm) {
        if (this.initialized) {
            console.warn('Game engine already initialized');
            return;
        }

        if (!vm || !vm.runtime) {
            console.error('Invalid VM provided to game engine');
            return;
        }

        this.vm = vm;

        // Hook into VM update loop
        this.integrateWithRuntime();

        // Setup event listeners
        this.setupEventListeners();

        // Enable physics by default
        physicsEngine.enable();

        this.initialized = true;
        console.log('✓ Game engine initialized successfully');
    }

    /**
     * Integrate with Scratch runtime update loop
     */
    integrateWithRuntime() {
        // Hook into VM step
        if (this.vm.runtime._step) {
            const originalStep = this.vm.runtime._step.bind(this.vm.runtime);
            this.vm.runtime._step = () => {
                this.update();
                return originalStep();
            };
        }
    }

    /**
     * Main update loop - called every frame
     */
    update() {
        const currentTime = Date.now();
        const deltaTime = Math.min(currentTime - this.lastUpdateTime, 33); // Cap at 33ms
        this.lastUpdateTime = currentTime;

        // Update sprite data cache
        this.updateSpriteCache();

        // Update all systems
        this.updatePhysics(deltaTime);
        this.updateCollisions();
        this.updateCamera(deltaTime);
        this.updateAnimations(deltaTime);
        this.updateParticles(deltaTime);
        this.updateScene(deltaTime);
    }

    /**
     * Update sprite data cache for all systems
     */
    updateSpriteCache() {
        this.spriteDataCache.clear();

        if (!this.vm || !this.vm.runtime) return;

        this.vm.runtime.targets.forEach(target => {
            if (target.isStage || !target.isOriginal) return;

            const bounds = target.getBounds();
            this.spriteDataCache.set(target.id, {
                id: target.id,
                x: target.x,
                y: target.y,
                direction: target.direction,
                size: target.size,
                visible: target.visible,
                bounds: {
                    left: bounds.left,
                    right: bounds.right,
                    top: bounds.top,
                    bottom: bounds.bottom
                },
                radius: Math.max(bounds.width, bounds.height) / 2,
                target: target
            });
        });
    }

    /**
     * Update physics system
     */
    updatePhysics(deltaTime) {
        if (!physicsEngine.enabled) return;

        // Update physics simulation
        physicsEngine.update(deltaTime);

        // Sync sprite positions with physics bodies
        physicsEngine.bodies.forEach((body, spriteId) => {
            const spriteData = this.spriteDataCache.get(spriteId);
            if (!spriteData) return;

            const target = spriteData.target;

            if (!body.isStatic) {
                // Update sprite from physics
                target.setXY(body.position.x, body.position.y);
                const rotation = (body.angle * (180 / Math.PI) + 90) % 360;
                target.setDirection(rotation);
            } else {
                // Sync static body from sprite (in case it was moved)
                physicsEngine.setPosition(spriteId, target.x, target.y);
                physicsEngine.setRotation(spriteId, target.direction - 90);
            }
        });
    }

    /**
     * Update collision system
     */
    updateCollisions() {
        if (this.spriteDataCache.size === 0) return;

        // Check collisions
        collisionSystem.checkCollisions(this.spriteDataCache);

        // Update triggers
        collisionSystem.updateTriggers(this.spriteDataCache);
    }

    /**
     * Update camera system
     */
    updateCamera(deltaTime) {
        cameraSystem.update(deltaTime);

        // Apply camera position to stage/viewport
        // This would integrate with the actual Scratch renderer
        const cameraPos = cameraSystem.getPosition();
        const zoom = cameraSystem.getZoom();

        // Store for blocks to access
        this.vm.runtime.cameraX = cameraPos.x;
        this.vm.runtime.cameraY = cameraPos.y;
        this.vm.runtime.cameraZoom = zoom;
    }

    /**
     * Update animation system
     */
    updateAnimations(deltaTime) {
        animationSystem.update(deltaTime);

        // Apply animation frames to sprites
        this.spriteDataCache.forEach((spriteData, spriteId) => {
            const frameData = animationSystem.getFrameData(spriteId);
            if (frameData && spriteData.target.setCostume) {
                // This would set the costume based on animation frame
                // Implementation depends on Scratch's costume system
            }
        });
    }

    /**
     * Update particle system
     */
    updateParticles(deltaTime) {
        particleSystem.update(deltaTime);
    }

    /**
     * Update scene manager
     */
    updateScene(deltaTime) {
        sceneManager.update(deltaTime);
    }

    /**
     * Setup event listeners for VM events
     */
    setupEventListeners() {
        // Clean up when sprite is deleted
        this.vm.on('targetWasRemoved', (target) => {
            if (!target || !target.id) return;

            physicsEngine.removeBody(target.id);
            collisionSystem.removeFromLayers(target.id);
            animationSystem.removeAnimation(target.id);
        });

        // Reset on project stop
        this.vm.on('PROJECT_STOP_ALL', () => {
            this.resetAllSystems();
        });

        // Handle scene load callbacks
        sceneManager.onSceneLoad = (sceneName, scene) => {
            console.log(`Scene loaded: ${sceneName}`);
        };

        sceneManager.onSceneUnload = (sceneName, scene) => {
            this.cleanupSceneResources(scene);
        };
    }

    /**
     * Reset all game systems
     */
    resetAllSystems() {
        // Reset physics velocities
        physicsEngine.bodies.forEach((body) => {
            physicsEngine.setVelocity(body.spriteId, 0, 0);
            physicsEngine.setAngularVelocity(body.spriteId, 0);
        });

        // Stop all audio
        audioSystem.stopAll();

        // Clear particles
        particleSystem.emitters.forEach(emitter => emitter.clear());

        // Reset camera
        cameraSystem.setPosition(0, 0);
        cameraSystem.setZoom(1);
        cameraSystem.stopFollow();
    }

    /**
     * Clean up resources when scene unloads
     */
    cleanupSceneResources(scene) {
        if (!scene) return;

        // Remove all sprites in scene
        if (scene.sprites && Array.isArray(scene.sprites)) {
            scene.sprites.forEach(spriteId => {
                physicsEngine.removeBody(spriteId);
                collisionSystem.removeFromLayers(spriteId);
                animationSystem.removeAnimation(spriteId);
            });
        }

        // Stop all sounds
        audioSystem.stopAll();

        // Clear particles
        particleSystem.emitters.forEach(emitter => emitter.clear());
    }

    /**
     * Get sprite data for a sprite ID
     * @param {string} spriteId
     * @returns {object}
     */
    getSpriteData(spriteId) {
        return this.spriteDataCache.get(spriteId);
    }

    /**
     * Shutdown game engine
     */
    shutdown() {
        if (!this.initialized) return;

        // Clear all systems
        physicsEngine.reset();
        collisionSystem.clear();
        cameraSystem.reset();
        sceneManager.clear();
        animationSystem.clear();
        audioSystem.clear();
        tilemapSystem.clear();
        particleSystem.clear();

        this.spriteDataCache.clear();
        this.initialized = false;

        console.log('Game engine shut down');
    }
}

// Create singleton instance
const gameEngineIntegration = new GameEngineIntegration();

export default gameEngineIntegration;
