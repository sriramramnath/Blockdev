/**
 * Audio System using Howler.js
 * Provides multi-channel audio with 3D positioning, crossfading, and ducking
 *
 * INCLUDES: Error handling, retry logic, fallback support
 */

import { Howl, Howler } from 'howler';

class AudioSystem {
    constructor() {
        this.sounds = new Map();
        this.channels = new Map();
        this.masterVolume = 1.0;
        this.listener = { x: 0, y: 0, z: 0 };
        this.duckingEnabled = true;
        this.duckingAmount = 0.3;
        this.activeCrossfades = new Map();

        // Error handling
        this.maxRetries = 3;
        this.retryDelay = 1000; // ms
        this.loadErrors = new Map();
        this._pendingLoads = new Map(); // FIXED: Track in-flight loads

        // Default channels
        this.createChannel('music', 0.7);
        this.createChannel('sfx', 1.0);
        this.createChannel('voice', 0.9);
        this.createChannel('ambient', 0.5);

        this.musicChannel = 'music';
        this.sfxChannel = 'sfx';

        // Configure Howler
        Howler.autoUnlock = true;
        Howler.html5PoolSize = 10;
    }

    /**
     * Create an audio channel
     * @param {string} name - Channel name
     * @param {number} volume - Default volume (0-1)
     */
    createChannel(name, volume = 1.0) {
        this.channels.set(name, {
            name,
            volume: Math.max(0, Math.min(1, volume)),
            sounds: new Set(),
            muted: false
        });
    }

    /**
     * Load a sound with retry logic
     * @param {string} soundId - Unique sound identifier
     * @param {object} options - Sound configuration
     * @returns {Promise}
     */
    loadSound(soundId, options = {}) {
        // FIXED: Check if already loaded or loading
        if (this.sounds.has(soundId)) {
            return Promise.resolve(soundId);
        }

        if (this._pendingLoads.has(soundId)) {
            return this._pendingLoads.get(soundId);
        }

        const promise = new Promise((resolve, reject) => {
            this._loadSoundWithRetry(soundId, options, 0, resolve, reject);
        }).finally(() => {
            this._pendingLoads.delete(soundId);
        });

        this._pendingLoads.set(soundId, promise);
        return promise;
    }

    /**
     * Internal method to load sound with retry logic
     * @private
     */
    _loadSoundWithRetry(soundId, options, attempt, resolve, reject) {
        const {
            src,
            sprite = null,
            loop = false,
            volume = 1.0,
            rate = 1.0,
            channel = 'sfx',
            preload = true,
            pool = 5,
            format = null
        } = options;

        if (!src) {
            const error = new Error('Sound source (src) is required');
            this.loadErrors.set(soundId, error);
            reject(error);
            return;
        }

        // Create Howl instance
        const howl = new Howl({
            src: Array.isArray(src) ? src : [src],
            sprite,
            loop,
            volume: volume * this.masterVolume,
            rate,
            preload,
            pool,
            format: format ? [format] : undefined,
            html5: options.html5 || false,
            onload: () => {
                // Success - clear any previous errors
                this.loadErrors.delete(soundId);

                const soundData = {
                    howl,
                    channel,
                    baseVolume: volume,
                    instances: new Set()
                };

                this.sounds.set(soundId, soundData);

                // Add to channel
                const channelData = this.channels.get(channel);
                if (channelData) {
                    channelData.sounds.add(soundId);
                }

                console.log(`✓ Audio loaded: ${soundId}`);
                resolve(soundId);
            },
            onloaderror: (id, error) => {
                console.error(`Failed to load audio: ${soundId} (attempt ${attempt + 1}/${this.maxRetries})`, error);

                // Retry logic
                if (attempt < this.maxRetries - 1) {
                    setTimeout(() => {
                        console.log(`Retrying audio load: ${soundId}`);
                        this._loadSoundWithRetry(soundId, options, attempt + 1, resolve, reject);
                    }, this.retryDelay * (attempt + 1)); // Exponential backoff
                } else {
                    // Max retries reached - create silent fallback
                    const fallbackError = new Error(`Failed to load audio after ${this.maxRetries} attempts: ${soundId}`);
                    this.loadErrors.set(soundId, fallbackError);

                    // Create silent fallback sound so game doesn't crash
                    const silentHowl = new Howl({
                        src: ['data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA'],
                        volume: 0
                    });

                    this.sounds.set(soundId, {
                        howl: silentHowl,
                        channel,
                        baseVolume: 0,
                        instances: new Set(),
                        isFallback: true
                    });

                    console.warn(`Using silent fallback for: ${soundId}`);
                    resolve(soundId); // Resolve anyway to not break game
                }
            },
            onplayerror: (id, error) => {
                console.error(`Playback error for ${soundId}:`, error);
                // Try to unlock audio context
                howl.once('unlock', () => {
                    howl.play();
                });
            }
        });
    }

    /**
     * Play a sound
     * @param {string} soundId
     * @param {object} options - Playback options
     * @returns {number} Instance ID
     */
    play(soundId, options = {}) {
        const soundData = this.sounds.get(soundId);
        if (!soundData) {
            console.warn(`Sound not found: ${soundId}`);
            return null;
        }

        const {
            volume = 1.0,
            rate = 1.0,
            loop = null,
            sprite = null,
            position = null,
            fadeIn = 0
        } = options;

        // Check if this is a fallback (silent) sound
        if (soundData.isFallback) {
            console.warn(`Attempting to play fallback sound: ${soundId}`);
            return null;
        }

        // Play the sound
        const instanceId = sprite ?
            soundData.howl.play(sprite) :
            soundData.howl.play();

        if (instanceId === null) {
            console.error(`Failed to play sound: ${soundId}`);
            return null;
        }

        // Store instance
        soundData.instances.add(instanceId);

        // Apply options
        const channelData = this.channels.get(soundData.channel);
        const finalVolume = volume * soundData.baseVolume *
                           (channelData ? channelData.volume : 1.0) *
                           this.masterVolume;

        soundData.howl.volume(finalVolume, instanceId);
        soundData.howl.rate(rate, instanceId);

        if (loop !== null) {
            soundData.howl.loop(loop, instanceId);
        }

        // 3D positioning
        if (position) {
            soundData.howl.pos(position.x, position.y, position.z || 0, instanceId);
        }

        // Fade in
        if (fadeIn > 0) {
            soundData.howl.fade(0, finalVolume, fadeIn, instanceId);
        }

        // Apply ducking if this is SFX
        if (soundData.channel === this.sfxChannel && this.duckingEnabled) {
            this.duckMusic();
        }

        // Clean up instance when done
        soundData.howl.once('end', () => {
            soundData.instances.delete(instanceId);

            // Restore music volume if no more SFX playing
            if (soundData.channel === this.sfxChannel) {
                this.checkRestoreMusic();
            }
        }, instanceId);

        return instanceId;
    }

    /**
     * Stop a sound
     * @param {string} soundId
     * @param {number} instanceId - Optional specific instance
     */
    stop(soundId, instanceId = null) {
        const soundData = this.sounds.get(soundId);
        if (!soundData) return;

        if (instanceId !== null) {
            soundData.howl.stop(instanceId);
            soundData.instances.delete(instanceId);
        } else {
            soundData.howl.stop();
            soundData.instances.clear();
        }
    }

    /**
     * Stop all sounds
     */
    stopAll() {
        this.sounds.forEach((soundData) => {
            soundData.howl.stop();
            soundData.instances.clear();
        });
    }

    /**
     * Pause a sound
     * @param {string} soundId
     * @param {number} instanceId
     */
    pause(soundId, instanceId = null) {
        const soundData = this.sounds.get(soundId);
        if (!soundData) return;

        soundData.howl.pause(instanceId);
    }

    /**
     * Resume a paused sound
     * @param {string} soundId
     * @param {number} instanceId
     */
    resume(soundId, instanceId = null) {
        const soundData = this.sounds.get(soundId);
        if (!soundData) return;

        soundData.howl.play(instanceId);
    }

    /**
     * Fade sound volume
     * @param {string} soundId
     * @param {number} fromVolume
     * @param {number} toVolume
     * @param {number} duration - milliseconds
     * @param {number} instanceId
     */
    fade(soundId, fromVolume, toVolume, duration, instanceId = null) {
        const soundData = this.sounds.get(soundId);
        if (!soundData) return;

        soundData.howl.fade(fromVolume, toVolume, duration, instanceId);
    }

    /**
     * Crossfade between two sounds
     * @param {string} fromSoundId
     * @param {string} toSoundId
     * @param {number} duration - milliseconds
     * @returns {Promise}
     */
    async crossfade(fromSoundId, toSoundId, duration = 1000) {
        const crossfadeId = `${fromSoundId}->${toSoundId}`;

        if (this.activeCrossfades.has(crossfadeId)) {
            console.warn(`Crossfade already in progress: ${crossfadeId}`);
            return;
        }

        this.activeCrossfades.set(crossfadeId, true);

        const fromSound = this.sounds.get(fromSoundId);
        const toSound = this.sounds.get(toSoundId);

        if (!fromSound || !toSound) {
            console.warn('Cannot crossfade: sound not found');
            this.activeCrossfades.delete(crossfadeId);
            return;
        }

        // Start new sound at 0 volume
        const toInstanceId = this.play(toSoundId, { volume: 0 });

        // Fade out old, fade in new
        this.fade(fromSoundId, 1, 0, duration);

        return new Promise(resolve => {
            setTimeout(() => {
                this.fade(toSoundId, 0, 1, duration / 2, toInstanceId);

                setTimeout(() => {
                    this.stop(fromSoundId);
                    this.activeCrossfades.delete(crossfadeId);
                    resolve();
                }, duration / 2);
            }, duration / 2);
        });
    }

    /**
     * Duck music volume for SFX
     */
    duckMusic() {
        const musicChannel = this.channels.get(this.musicChannel);
        if (!musicChannel) return;

        musicChannel.sounds.forEach(soundId => {
            const soundData = this.sounds.get(soundId);
            if (soundData && soundData.instances.size > 0) {
                soundData.instances.forEach(instanceId => {
                    const currentVol = soundData.howl.volume(instanceId);
                    soundData.howl.fade(currentVol, currentVol * this.duckingAmount, 200, instanceId);
                });
            }
        });
    }

    /**
     * Restore music volume after SFX
     */
    checkRestoreMusic() {
        // Check if any SFX still playing
        const sfxChannel = this.channels.get(this.sfxChannel);
        if (!sfxChannel) return;

        let sfxPlaying = false;
        sfxChannel.sounds.forEach(soundId => {
            const soundData = this.sounds.get(soundId);
            if (soundData && soundData.instances.size > 0) {
                sfxPlaying = true;
            }
        });

        // If no SFX playing, restore music volume
        if (!sfxPlaying) {
            const musicChannel = this.channels.get(this.musicChannel);
            if (!musicChannel) return;

            musicChannel.sounds.forEach(soundId => {
                const soundData = this.sounds.get(soundId);
                if (soundData && soundData.instances.size > 0) {
                    soundData.instances.forEach(instanceId => {
                        const targetVol = soundData.baseVolume * musicChannel.volume * this.masterVolume;
                        soundData.howl.fade(soundData.howl.volume(instanceId), targetVol, 300, instanceId);
                    });
                }
            });
        }
    }

    /**
     * Set master volume
     * @param {number} volume - 0 to 1
     */
    setMasterVolume(volume) {
        this.masterVolume = Math.max(0, Math.min(1, volume));
        Howler.volume(this.masterVolume);
    }

    /**
     * Set channel volume
     * @param {string} channelName
     * @param {number} volume - 0 to 1
     */
    setChannelVolume(channelName, volume) {
        const channel = this.channels.get(channelName);
        if (!channel) return;

        channel.volume = Math.max(0, Math.min(1, volume));

        // Update all sounds in channel
        channel.sounds.forEach(soundId => {
            const soundData = this.sounds.get(soundId);
            if (soundData) {
                const newVolume = soundData.baseVolume * channel.volume * this.masterVolume;
                soundData.howl.volume(newVolume);
            }
        });
    }

    /**
     * Mute/unmute channel
     * @param {string} channelName
     * @param {boolean} muted
     */
    muteChannel(channelName, muted = true) {
        const channel = this.channels.get(channelName);
        if (!channel) return;

        channel.muted = muted;

        channel.sounds.forEach(soundId => {
            const soundData = this.sounds.get(soundId);
            if (soundData) {
                soundData.howl.mute(muted);
            }
        });
    }

    /**
     * Set 3D listener position (camera)
     * @param {number} x
     * @param {number} y
     * @param {number} z
     */
    setListenerPosition(x, y, z = 0) {
        this.listener = { x, y, z };
        Howler.pos(x, y, z);
    }

    /**
     * Set 3D listener orientation
     * @param {number} x
     * @param {number} y
     * @param {number} z
     */
    setListenerOrientation(x, y, z = -1) {
        Howler.orientation(x, y, z, 0, 1, 0);
    }

    /**
     * Set sound 3D position
     * @param {string} soundId
     * @param {number} x
     * @param {number} y
     * @param {number} z
     * @param {number} instanceId
     */
    setSoundPosition(soundId, x, y, z = 0, instanceId = null) {
        const soundData = this.sounds.get(soundId);
        if (!soundData) return;

        soundData.howl.pos(x, y, z, instanceId);
    }

    /**
     * Check if sound is playing
     * @param {string} soundId
     * @param {number} instanceId
     * @returns {boolean}
     */
    isPlaying(soundId, instanceId = null) {
        const soundData = this.sounds.get(soundId);
        if (!soundData) return false;

        return soundData.howl.playing(instanceId);
    }

    /**
     * Get sound duration
     * @param {string} soundId
     * @returns {number} Duration in seconds
     */
    getDuration(soundId) {
        const soundData = this.sounds.get(soundId);
        if (!soundData) return 0;

        return soundData.howl.duration();
    }

    /**
     * Seek to position in sound
     * @param {string} soundId
     * @param {number} position - Position in seconds
     * @param {number} instanceId
     */
    seek(soundId, position, instanceId = null) {
        const soundData = this.sounds.get(soundId);
        if (!soundData) return;

        soundData.howl.seek(position, instanceId);
    }

    /**
     * Get load error for a sound
     * @param {string} soundId
     * @returns {Error|null}
     */
    getLoadError(soundId) {
        return this.loadErrors.get(soundId) || null;
    }

    /**
     * Check if sound loaded successfully
     * @param {string} soundId
     * @returns {boolean}
     */
    hasLoadError(soundId) {
        return this.loadErrors.has(soundId);
    }

    /**
     * Unload a sound
     * @param {string} soundId
     */
    unloadSound(soundId) {
        const soundData = this.sounds.get(soundId);
        if (!soundData) return;

        // Stop all instances
        soundData.howl.stop();
        soundData.instances.clear();

        // Remove from channel
        const channelData = this.channels.get(soundData.channel);
        if (channelData) {
            channelData.sounds.delete(soundId);
        }

        // Unload from Howler
        soundData.howl.unload();

        // Remove from map
        this.sounds.delete(soundId);
        this.loadErrors.delete(soundId);
    }

    /**
     * Clear all sounds
     */
    clear() {
        this.sounds.forEach((soundData, soundId) => {
            this.unloadSound(soundId);
        });

        this.sounds.clear();
        this.loadErrors.clear();
        this.activeCrossfades.clear();
    }

    /**
     * Reset audio system
     */
    reset() {
        this.clear();

        // Reset channels
        this.channels.forEach(channel => {
            channel.sounds.clear();
            channel.muted = false;
        });

        this.masterVolume = 1.0;
        Howler.volume(1.0);
    }
}

// Create singleton instance
const audioSystem = new AudioSystem();

export default audioSystem;
