/**
 * Scene/Level Management System
 * Handles multiple scenes, transitions, and persistent data
 *
 * FIXED: Proper cleanup, race condition handling with queue
 */

import physicsEngine from './physics-engine';
import audioSystem from './audio-system';
import particleSystem from './particle-system';
import animationSystem from './animation-system';
import collisionSystem from './collision-system';

class SceneManager {
    constructor() {
        this.scenes = new Map();
        this.currentScene = null;
        this.previousScene = null;
        this.isTransitioning = false;
        this.transitionData = null;
        this.persistentData = new Map();
        this.preloadedScenes = new Set();
        this.onSceneLoad = null;
        this.onSceneUnload = null;

        // FIXED: Add queue for scene loading
        this.loadQueue = [];
        this.isProcessingQueue = false;
    }

    /**
     * Register a new scene
     * @param {string} name - Scene name
     * @param {object} sceneData - Scene configuration
     */
    registerScene(name, sceneData = {}) {
        this.scenes.set(name, {
            name,
            sprites: sceneData.sprites || [],
            backdrop: sceneData.backdrop || null,
            sounds: sceneData.sounds || [],
            variables: sceneData.variables || {},
            onLoad: sceneData.onLoad || null,
            onUnload: sceneData.onUnload || null,
            onUpdate: sceneData.onUpdate || null,
            camera: sceneData.camera || null,
            physics: sceneData.physics || null,
            loaded: false
        });
    }

    /**
     * Load a scene (with queue to prevent race conditions)
     * @param {string} name - Scene name
     * @param {object} transition - Transition options
     * @returns {Promise}
     */
    async loadScene(name, transition = null) {
        if (!this.scenes.has(name)) {
            throw new Error(`Scene "${name}" not found`);
        }

        // FIXED: Add to queue instead of failing
        return new Promise((resolve, reject) => {
            this.loadQueue.push({ name, transition, resolve, reject });
            this.processQueue();
        });
    }

    /**
     * FIXED: Process scene loading queue
     */
    async processQueue() {
        if (this.isProcessingQueue || this.loadQueue.length === 0) return;

        this.isProcessingQueue = true;

        while (this.loadQueue.length > 0) {
            const { name, transition, resolve, reject } = this.loadQueue.shift();

            try {
                await this._loadSceneInternal(name, transition);
                resolve();
            } catch (error) {
                console.error(`Failed to load scene "${name}":`, error);
                reject(error);
            }
        }

        this.isProcessingQueue = false;
    }

    /**
     * Internal scene loading implementation
     * @private
     */
    async _loadSceneInternal(name, transition = null) {
        this.isTransitioning = true;
        const scene = this.scenes.get(name);

        // Start transition
        if (transition) {
            await this.startTransition(transition);
        }

        // FIXED: Unload current scene with proper cleanup
        if (this.currentScene) {
            await this.unloadCurrentScene();
        }

        // Load new scene
        await this.loadSceneData(scene);

        // Set as current
        this.previousScene = this.currentScene;
        this.currentScene = name;

        // Call onLoad callback
        if (scene.onLoad) {
            try {
                scene.onLoad(this.persistentData);
            } catch (error) {
                console.error(`Error in scene.onLoad for "${name}":`, error);
            }
        }

        if (this.onSceneLoad) {
            try {
                this.onSceneLoad(name, scene);
            } catch (error) {
                console.error(`Error in onSceneLoad hook for "${name}":`, error);
            }
        }

        // End transition
        if (transition) {
            await this.endTransition(transition);
        }

        this.isTransitioning = false;
    }

    /**
     * Reload current scene
     * @param {object} transition - Transition options
     * @returns {Promise}
     */
    async reloadScene(transition = null) {
        if (!this.currentScene) return;
        await this.loadScene(this.currentScene, transition);
    }

    /**
     * FIXED: Unload current scene with proper cleanup
     * @returns {Promise}
     */
    async unloadCurrentScene() {
        if (!this.currentScene) return;

        const scene = this.scenes.get(this.currentScene);
        if (!scene) return;

        // Call onUnload callback first
        if (scene.onUnload) {
            try {
                scene.onUnload(this.persistentData);
            } catch (error) {
                console.error(`Error in scene.onUnload for "${this.currentScene}":`, error);
            }
        }

        if (this.onSceneUnload) {
            try {
                this.onSceneUnload(this.currentScene, scene);
            } catch (error) {
                console.error(`Error in onSceneUnload hook for "${this.currentScene}":`, error);
            }
        }

        // FIXED: Clean up all resources
        this.cleanupSceneResources(scene);

        // Mark as unloaded
        scene.loaded = false;
    }

    /**
     * FIXED: Clean up all scene resources
     * @param {object} scene
     */
    cleanupSceneResources(scene) {
        if (!scene) return;

        // Remove physics bodies for all sprites in scene
        if (scene.sprites && Array.isArray(scene.sprites)) {
            scene.sprites.forEach(spriteId => {
                physicsEngine.removeBody(spriteId);
                collisionSystem.removeFromLayers(spriteId);
                animationSystem.removeAnimation(spriteId);
            });
        }

        // Stop all sounds
        audioSystem.stopAll();

        // Clear all particle emitters
        if (particleSystem && particleSystem.emitters) {
            particleSystem.emitters.forEach(emitter => {
                emitter.clear();
            });
        }

        // Reset velocities for any remaining physics bodies
        if (physicsEngine && physicsEngine.bodies) {
            physicsEngine.bodies.forEach(body => {
                physicsEngine.setVelocity(body.spriteId, 0, 0);
                physicsEngine.setAngularVelocity(body.spriteId, 0);
            });
        }
    }

    /**
     * Load scene data (sprites, backdrop, etc.)
     * @param {object} scene
     * @returns {Promise}
     */
    async loadSceneData(scene) {
        // Placeholder - this would integrate with actual Scratch runtime
        return new Promise(resolve => {
            setTimeout(() => {
                scene.loaded = true;
                resolve();
            }, 100);
        });
    }

    /**
     * Preload a scene in the background
     * @param {string} name
     * @returns {Promise}
     */
    async preloadScene(name) {
        if (!this.scenes.has(name)) {
            throw new Error(`Scene "${name}" not found`);
        }

        const scene = this.scenes.get(name);

        if (!this.preloadedScenes.has(name)) {
            await this.loadSceneData(scene);
            this.preloadedScenes.add(name);
        }
    }

    /**
     * Start scene transition effect
     * @param {object} transition
     * @returns {Promise}
     */
    async startTransition(transition) {
        const type = transition.type || 'fade';
        const duration = transition.duration || 500;

        // Fallback for non-browser environments
        const raf = typeof requestAnimationFrame !== 'undefined'
            ? requestAnimationFrame
            : (cb) => setTimeout(cb, 16);

        return new Promise(resolve => {
            this.transitionData = { type, progress: 0, duration };

            const startTime = Date.now();
            const animate = () => {
                const elapsed = Date.now() - startTime;
                this.transitionData.progress = Math.min(elapsed / duration, 1);

                if (this.transitionData.progress < 0.5) {
                    raf(animate);
                } else {
                    resolve();
                }
            };

            raf(animate);
        });
    }

    /**
     * End scene transition effect
     * @param {object} transition
     * @returns {Promise}
     */
    async endTransition(transition) {
        const duration = transition.duration || 500;

        // Fallback for non-browser environments
        const raf = typeof requestAnimationFrame !== 'undefined'
            ? requestAnimationFrame
            : (cb) => setTimeout(cb, 16);

        return new Promise(resolve => {
            const startTime = Date.now();
            const animate = () => {
                const elapsed = Date.now() - startTime;
                const progress = Math.min(elapsed / (duration / 2), 1);
                this.transitionData.progress = 0.5 + (progress * 0.5);

                if (progress < 1) {
                    raf(animate);
                } else {
                    this.transitionData = null;
                    resolve();
                }
            };

            raf(animate);
        });
    }

    getCurrentScene() {
        return this.currentScene;
    }

    getPreviousScene() {
        return this.previousScene;
    }

    hasScene(name) {
        return this.scenes.has(name);
    }

    getSceneNames() {
        return Array.from(this.scenes.keys());
    }

    setPersistentData(key, value) {
        this.persistentData.set(key, value);
    }

    getPersistentData(key) {
        return this.persistentData.get(key);
    }

    hasPersistentData(key) {
        return this.persistentData.has(key);
    }

    clearPersistentData(key = null) {
        if (key) {
            this.persistentData.delete(key);
        } else {
            this.persistentData.clear();
        }
    }

    createFromTemplate(name, templateName) {
        if (!this.scenes.has(templateName)) {
            throw new Error(`Template scene "${templateName}" not found`);
        }

        const template = this.scenes.get(templateName);
        // FIXED: Use structuredClone for proper deep copying
        const newScene = structuredClone ?
            structuredClone(template) :
            JSON.parse(JSON.stringify(template));
        newScene.name = name;

        this.scenes.set(name, newScene);
    }

    removeScene(name) {
        if (name === this.currentScene) {
            console.warn('Cannot remove current scene');
            return;
        }

        this.scenes.delete(name);
        this.preloadedScenes.delete(name);
    }

    getSceneData(name) {
        return this.scenes.get(name);
    }

    updateSceneData(name, data) {
        if (!this.scenes.has(name)) return;

        const scene = this.scenes.get(name);
        Object.assign(scene, data);
    }

    exportScene(name) {
        if (!this.scenes.has(name)) return null;
        return JSON.stringify(this.scenes.get(name), null, 2);
    }

    importScene(jsonData) {
        try {
            const scene = JSON.parse(jsonData);

            if (!scene.name || typeof scene.name !== 'string') {
                throw new Error('Invalid scene: missing or invalid name');
            }

            if (this.scenes.has(scene.name)) {
                console.warn(`Scene "${scene.name}" already exists, overwriting`);
            }

            this.scenes.set(scene.name, scene);
            return scene.name;
        } catch (error) {
            console.error('Failed to import scene:', error);
            return null;
        }
    }

    update(deltaTime) {
        if (!this.currentScene) return;

        const scene = this.scenes.get(this.currentScene);
        if (scene && scene.onUpdate) {
            try {
                scene.onUpdate(deltaTime);
            } catch (error) {
                console.error(`Error in scene.onUpdate for "${this.currentScene}":`, error);
            }
        }
    }

    getTransitionProgress() {
        return this.transitionData ? this.transitionData.progress : 0;
    }

    isInTransition() {
        return this.isTransitioning;
    }

    clear() {
        // Clean up current scene before clearing
        if (this.currentScene) {
            const scene = this.scenes.get(this.currentScene);
            this.cleanupSceneResources(scene);
        }

        this.scenes.clear();
        this.currentScene = null;
        this.previousScene = null;
        this.isTransitioning = false;
        this.transitionData = null;
        this.preloadedScenes.clear();
        this.loadQueue = [];
        this.isProcessingQueue = false;
    }

    reset() {
        this.clear();
        this.persistentData.clear();
    }
}

// Create singleton instance
const sceneManager = new SceneManager();

export default sceneManager;
