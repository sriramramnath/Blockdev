/**
 * Animation System
 * Handles sprite sheet animations with frame-based playback
 *
 * NOTE: Frame interpolation recommended for smoother animations
 */

class AnimationSystem {
    constructor() {
        this.animations = new Map();
        this.activeAnimations = new Map();
        this.spriteSheets = new Map();
    }

    /**
     * Load a sprite sheet
     * @param {string} sheetId - Unique identifier
     * @param {object} data - {imageUrl, frameWidth, frameHeight, frames}
     * @returns {Promise}
     */
    loadSpriteSheet(sheetId, data) {
        return new Promise((resolve, reject) => {
            const {
                imageUrl,
                frameWidth,
                frameHeight,
                frames = null
            } = data;

            if (!imageUrl) {
                reject(new Error('imageUrl is required'));
                return;
            }

            if (!frameWidth || frameWidth <= 0) {
                reject(new Error('frameWidth must be a positive number'));
                return;
            }

            if (!frameHeight || frameHeight <= 0) {
                reject(new Error('frameHeight must be a positive number'));
                return;
            }

            const image = new Image();
            image.onload = () => {
                const cols = Math.floor(image.width / frameWidth);
                const rows = Math.floor(image.height / frameHeight);
                const totalFrames = frames || (cols * rows);

                this.spriteSheets.set(sheetId, {
                    image,
                    frameWidth,
                    frameHeight,
                    cols,
                    rows,
                    totalFrames
                });

                resolve(sheetId);
            };

            image.onerror = () => {
                reject(new Error(`Failed to load sprite sheet: ${imageUrl}`));
            };

            image.src = imageUrl;
        });
    }

    /**
     * Create animation from sprite sheet
     * @param {string} animationId
     * @param {string} sheetId
     * @param {object} options
     */
    createAnimation(animationId, sheetId, options = {}) {
        const sheet = this.spriteSheets.get(sheetId);
        if (!sheet) {
            console.error(`Sprite sheet not found: ${sheetId}`);
            return;
        }

        const {
            startFrame = 0,
            endFrame = sheet.totalFrames - 1,
            fps = 12,
            loop = true,
            yoyo = false,
            frames = null
        } = options;

        // Validate frame range if not using custom frames
        if (!frames) {
            if (startFrame < 0 || startFrame >= sheet.totalFrames) {
                console.error(`startFrame ${startFrame} out of bounds [0, ${sheet.totalFrames - 1}]`);
                return;
            }
            if (endFrame < 0 || endFrame >= sheet.totalFrames) {
                console.error(`endFrame ${endFrame} out of bounds [0, ${sheet.totalFrames - 1}]`);
                return;
            }
            if (startFrame > endFrame) {
                console.error(`startFrame ${startFrame} must be <= endFrame ${endFrame}`);
                return;
            }
        }

        // Use custom frame sequence or range
        const frameSequence = frames || this.generateFrameRange(startFrame, endFrame);

        this.animations.set(animationId, {
            sheetId,
            frameSequence,
            fps,
            frameDuration: 1000 / fps,
            loop,
            yoyo,
            totalFrames: frameSequence.length
        });
    }

    /**
     * Generate frame range
     * @private
     */
    generateFrameRange(start, end) {
        const frames = [];
        for (let i = start; i <= end; i++) {
            frames.push(i);
        }
        return frames;
    }

    /**
     * Play animation on a sprite
     * @param {string} spriteId
     * @param {string} animationId
     * @param {object} options
     */
    play(spriteId, animationId, options = {}) {
        const animation = this.animations.get(animationId);
        if (!animation) {
            console.error(`Animation not found: ${animationId}`);
            return;
        }

        const {
            speed = 1.0,
            startFrame = 0,
            onComplete = null
        } = options;

        // Validate and clamp startFrame
        const clampedStartFrame = Math.max(0, Math.min(animation.totalFrames - 1, startFrame));
        if (clampedStartFrame !== startFrame) {
            console.warn(`startFrame ${startFrame} out of bounds, clamped to ${clampedStartFrame}`);
        }

        this.activeAnimations.set(spriteId, {
            animationId,
            currentFrame: clampedStartFrame,
            time: 0,
            playing: true,
            speed,
            direction: 1, // 1 for forward, -1 for reverse (yoyo)
            onComplete
        });
    }

    /**
     * Stop animation
     * @param {string} spriteId
     */
    stop(spriteId) {
        this.activeAnimations.delete(spriteId);
    }

    /**
     * Pause animation
     * @param {string} spriteId
     */
    pause(spriteId) {
        const state = this.activeAnimations.get(spriteId);
        if (state) {
            state.playing = false;
        }
    }

    /**
     * Resume animation
     * @param {string} spriteId
     */
    resume(spriteId) {
        const state = this.activeAnimations.get(spriteId);
        if (state) {
            state.playing = true;
        }
    }

    /**
     * Set animation speed
     * @param {string} spriteId
     * @param {number} speed - Multiplier (1.0 = normal)
     */
    setSpeed(spriteId, speed) {
        const state = this.activeAnimations.get(spriteId);
        if (state) {
            state.speed = speed;
        }
    }

    /**
     * Go to specific frame
     * @param {string} spriteId
     * @param {number} frame
     */
    gotoFrame(spriteId, frame) {
        const state = this.activeAnimations.get(spriteId);
        if (state) {
            const animation = this.animations.get(state.animationId);
            state.currentFrame = Math.max(0, Math.min(animation.totalFrames - 1, frame));
            state.time = 0;
        }
    }

    /**
     * Update animations
     * @param {number} deltaTime - Time since last update in ms
     */
    update(deltaTime) {
        this.activeAnimations.forEach((state, spriteId) => {
            if (!state.playing) return;

            const animation = this.animations.get(state.animationId);
            if (!animation) return;

            // Update time
            state.time += deltaTime * state.speed;

            // Check if frame should advance
            if (state.time >= animation.frameDuration) {
                state.time -= animation.frameDuration;

                // Advance frame
                state.currentFrame += state.direction;

                // Handle loop/yoyo
                if (state.currentFrame >= animation.totalFrames) {
                    if (animation.yoyo && animation.totalFrames > 1) {
                        // Reverse direction (only for multi-frame animations)
                        state.direction = -1;
                        state.currentFrame = animation.totalFrames - 2;
                    } else if (animation.loop) {
                        // Loop to start
                        state.currentFrame = 0;
                    } else {
                        // Stop at end
                        state.currentFrame = animation.totalFrames - 1;
                        state.playing = false;

                        if (state.onComplete) {
                            state.onComplete(spriteId);
                        }
                    }
                } else if (state.currentFrame < 0) {
                    if (animation.yoyo && animation.totalFrames > 1) {
                        // Reverse direction back to forward (only for multi-frame animations)
                        state.direction = 1;
                        state.currentFrame = 1;
                    } else {
                        state.currentFrame = 0;
                    }
                }
            }
        });
    }

    /**
     * Get current frame data for a sprite
     * @param {string} spriteId
     * @returns {object|null} {sheetId, frameIndex, frameX, frameY}
     */
    getFrameData(spriteId) {
        const state = this.activeAnimations.get(spriteId);
        if (!state) return null;

        const animation = this.animations.get(state.animationId);
        if (!animation) return null;

        const sheet = this.spriteSheets.get(animation.sheetId);
        if (!sheet) return null;

        const frameIndex = animation.frameSequence[state.currentFrame];
        const frameX = (frameIndex % sheet.cols) * sheet.frameWidth;
        const frameY = Math.floor(frameIndex / sheet.cols) * sheet.frameHeight;

        return {
            sheetId: animation.sheetId,
            frameIndex,
            frameX,
            frameY,
            frameWidth: sheet.frameWidth,
            frameHeight: sheet.frameHeight,
            image: sheet.image
        };
    }

    /**
     * Check if sprite has active animation
     * @param {string} spriteId
     * @returns {boolean}
     */
    isPlaying(spriteId) {
        const state = this.activeAnimations.get(spriteId);
        return state ? state.playing : false;
    }

    /**
     * Get current frame number
     * @param {string} spriteId
     * @returns {number}
     */
    getCurrentFrame(spriteId) {
        const state = this.activeAnimations.get(spriteId);
        return state ? state.currentFrame : 0;
    }

    /**
     * Remove animation from sprite
     * @param {string} spriteId
     */
    removeAnimation(spriteId) {
        this.activeAnimations.delete(spriteId);
    }

    /**
     * Remove animation definition
     * @param {string} animationId
     */
    removeAnimationDefinition(animationId) {
        this.animations.delete(animationId);
    }

    /**
     * Unload sprite sheet
     * @param {string} sheetId
     */
    unloadSpriteSheet(sheetId) {
        // FIXED: Stop any active animations using this sheet BEFORE deleting definitions
        this.activeAnimations.forEach((state, spriteId) => {
            const animation = this.animations.get(state.animationId);
            if (animation && animation.sheetId === sheetId) {
                this.activeAnimations.delete(spriteId);
            }
        });

        // Remove animations using this sheet
        this.animations.forEach((animation, animationId) => {
            if (animation.sheetId === sheetId) {
                this.animations.delete(animationId);
            }
        });

        // Finally remove the sprite sheet itself
        this.spriteSheets.delete(sheetId);
    }

    /**
     * Clear all animations
     */
    clear() {
        this.activeAnimations.clear();
        this.animations.clear();
        this.spriteSheets.clear();
    }

    /**
     * Reset system
     */
    reset() {
        this.clear();
    }
}

// Create singleton instance
const animationSystem = new AnimationSystem();

export default animationSystem;
