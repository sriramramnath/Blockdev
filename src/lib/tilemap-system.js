/**
 * Tilemap System
 * Grid-based tilemap management with layers
 *
 * NOTE: Chunk-based storage recommended for large maps (1000x1000+)
 */

class TilemapSystem {
    constructor() {
        this.tilemaps = new Map();
        this.tilesets = new Map();
    }

    /**
     * Load a tileset
     * @param {string} tilesetId
     * @param {object} options
     * @returns {Promise}
     */
    loadTileset(tilesetId, options = {}) {
        return new Promise((resolve, reject) => {
            const {
                imageUrl,
                tileWidth,
                tileHeight,
                margin = 0,
                spacing = 0,
                tiles = {}
            } = options;

            if (!imageUrl || !tileWidth || !tileHeight) {
                reject(new Error('imageUrl, tileWidth, and tileHeight are required'));
                return;
            }

            const image = new Image();
            image.onload = () => {
                const cols = Math.floor((image.width - margin * 2 + spacing) / (tileWidth + spacing));
                const rows = Math.floor((image.height - margin * 2 + spacing) / (tileHeight + spacing));

                this.tilesets.set(tilesetId, {
                    image,
                    tileWidth,
                    tileHeight,
                    cols,
                    rows,
                    margin,
                    spacing,
                    tiles, // Tile properties (collision, animation, etc.)
                    totalTiles: cols * rows
                });

                resolve(tilesetId);
            };

            image.onerror = () => {
                reject(new Error(`Failed to load tileset: ${imageUrl}`));
            };

            image.src = imageUrl;
        });
    }

    /**
     * Create a tilemap
     * @param {string} tilemapId
     * @param {object} options
     */
    createTilemap(tilemapId, options = {}) {
        const {
            width = 32,
            height = 32,
            tileWidth = 16,
            tileHeight = 16,
            defaultTilesetId = null
        } = options;

        this.tilemaps.set(tilemapId, {
            width,
            height,
            tileWidth,
            tileHeight,
            defaultTilesetId,
            layers: new Map(),
            properties: {}
        });
    }

    /**
     * Add layer to tilemap
     * @param {string} tilemapId
     * @param {string} layerId
     * @param {object} options
     */
    addLayer(tilemapId, layerId, options = {}) {
        const tilemap = this.tilemaps.get(tilemapId);
        if (!tilemap) {
            console.error(`Tilemap not found: ${tilemapId}`);
            return;
        }

        const {
            tilesetId = tilemap.defaultTilesetId,
            visible = true,
            opacity = 1.0,
            zIndex = 0
        } = options;

        // Initialize 2D array of tiles
        // NOTE: For large maps, consider chunk-based storage
        const tiles = new Array(tilemap.height);
        for (let y = 0; y < tilemap.height; y++) {
            tiles[y] = new Array(tilemap.width).fill(null);
        }

        tilemap.layers.set(layerId, {
            tiles,
            tilesetId,
            visible,
            opacity,
            zIndex
        });
    }

    /**
     * Set tile at position
     * @param {string} tilemapId
     * @param {string} layerId
     * @param {number} x - Tile X coordinate
     * @param {number} y - Tile Y coordinate
     * @param {number} tileIndex - Tile index in tileset (null to clear)
     */
    setTile(tilemapId, layerId, x, y, tileIndex) {
        const tilemap = this.tilemaps.get(tilemapId);
        if (!tilemap) return;

        const layer = tilemap.layers.get(layerId);
        if (!layer) return;

        if (x < 0 || x >= tilemap.width || y < 0 || y >= tilemap.height) {
            console.warn(`Tile position out of bounds: (${x}, ${y})`);
            return;
        }

        layer.tiles[y][x] = tileIndex;
    }

    /**
     * Get tile at position
     * @param {string} tilemapId
     * @param {string} layerId
     * @param {number} x
     * @param {number} y
     * @returns {number|null}
     */
    getTile(tilemapId, layerId, x, y) {
        const tilemap = this.tilemaps.get(tilemapId);
        if (!tilemap) return null;

        const layer = tilemap.layers.get(layerId);
        if (!layer) return null;

        if (x < 0 || x >= tilemap.width || y < 0 || y >= tilemap.height) {
            return null;
        }

        return layer.tiles[y][x];
    }

    /**
     * Fill region with tile
     * @param {string} tilemapId
     * @param {string} layerId
     * @param {number} startX
     * @param {number} startY
     * @param {number} endX
     * @param {number} endY
     * @param {number} tileIndex
     */
    fillRegion(tilemapId, layerId, startX, startY, endX, endY, tileIndex) {
        for (let y = startY; y <= endY; y++) {
            for (let x = startX; x <= endX; x++) {
                this.setTile(tilemapId, layerId, x, y, tileIndex);
            }
        }
    }

    /**
     * Flood fill starting from position
     * @param {string} tilemapId
     * @param {string} layerId
     * @param {number} x
     * @param {number} y
     * @param {number} tileIndex
     */
    floodFill(tilemapId, layerId, x, y, tileIndex) {
        const tilemap = this.tilemaps.get(tilemapId);
        if (!tilemap) return;

        const layer = tilemap.layers.get(layerId);
        if (!layer) return;

        const targetTile = this.getTile(tilemapId, layerId, x, y);
        if (targetTile === tileIndex) return; // Already filled

        const stack = [[x, y]];
        const visited = new Set();

        while (stack.length > 0) {
            const [cx, cy] = stack.pop();
            const key = `${cx},${cy}`;

            if (visited.has(key)) continue;
            visited.add(key);

            if (cx < 0 || cx >= tilemap.width || cy < 0 || cy >= tilemap.height) continue;

            const currentTile = layer.tiles[cy][cx];
            if (currentTile !== targetTile) continue;

            // Set tile
            layer.tiles[cy][cx] = tileIndex;

            // Add neighbors
            stack.push([cx + 1, cy]);
            stack.push([cx - 1, cy]);
            stack.push([cx, cy + 1]);
            stack.push([cx, cy - 1]);
        }
    }

    /**
     * Convert world coordinates to tile coordinates
     * @param {string} tilemapId
     * @param {number} worldX
     * @param {number} worldY
     * @returns {object} {x, y}
     */
    worldToTile(tilemapId, worldX, worldY) {
        const tilemap = this.tilemaps.get(tilemapId);
        if (!tilemap) return { x: 0, y: 0 };

        return {
            x: Math.floor(worldX / tilemap.tileWidth),
            y: Math.floor(worldY / tilemap.tileHeight)
        };
    }

    /**
     * Convert tile coordinates to world coordinates
     * @param {string} tilemapId
     * @param {number} tileX
     * @param {number} tileY
     * @returns {object} {x, y}
     */
    tileToWorld(tilemapId, tileX, tileY) {
        const tilemap = this.tilemaps.get(tilemapId);
        if (!tilemap) return { x: 0, y: 0 };

        return {
            x: tileX * tilemap.tileWidth,
            y: tileY * tilemap.tileHeight
        };
    }

    /**
     * Get tile properties from tileset
     * @param {string} tilesetId
     * @param {number} tileIndex
     * @returns {object}
     */
    getTileProperties(tilesetId, tileIndex) {
        const tileset = this.tilesets.get(tilesetId);
        if (!tileset) return {};

        return tileset.tiles[tileIndex] || {};
    }

    /**
     * Set tile properties in tileset
     * @param {string} tilesetId
     * @param {number} tileIndex
     * @param {object} properties
     */
    setTileProperties(tilesetId, tileIndex, properties) {
        const tileset = this.tilesets.get(tilesetId);
        if (!tileset) return;

        tileset.tiles[tileIndex] = { ...tileset.tiles[tileIndex], ...properties };
    }

    /**
     * Get tiles in a region
     * @param {string} tilemapId
     * @param {string} layerId
     * @param {number} startX
     * @param {number} startY
     * @param {number} width
     * @param {number} height
     * @returns {Array} Array of {x, y, tileIndex}
     */
    getTilesInRegion(tilemapId, layerId, startX, startY, width, height) {
        const tiles = [];
        const endX = startX + width;
        const endY = startY + height;

        for (let y = startY; y < endY; y++) {
            for (let x = startX; x < endX; x++) {
                const tileIndex = this.getTile(tilemapId, layerId, x, y);
                if (tileIndex !== null) {
                    tiles.push({ x, y, tileIndex });
                }
            }
        }

        return tiles;
    }

    /**
     * Find all tiles with specific index
     * @param {string} tilemapId
     * @param {string} layerId
     * @param {number} tileIndex
     * @returns {Array} Array of {x, y}
     */
    findTiles(tilemapId, layerId, tileIndex) {
        const tilemap = this.tilemaps.get(tilemapId);
        if (!tilemap) return [];

        const layer = tilemap.layers.get(layerId);
        if (!layer) return [];

        const positions = [];

        for (let y = 0; y < tilemap.height; y++) {
            for (let x = 0; x < tilemap.width; x++) {
                if (layer.tiles[y][x] === tileIndex) {
                    positions.push({ x, y });
                }
            }
        }

        return positions;
    }

    /**
     * Set layer visibility
     * @param {string} tilemapId
     * @param {string} layerId
     * @param {boolean} visible
     */
    setLayerVisible(tilemapId, layerId, visible) {
        const tilemap = this.tilemaps.get(tilemapId);
        if (!tilemap) return;

        const layer = tilemap.layers.get(layerId);
        if (layer) {
            layer.visible = visible;
        }
    }

    /**
     * Set layer opacity
     * @param {string} tilemapId
     * @param {string} layerId
     * @param {number} opacity - 0 to 1
     */
    setLayerOpacity(tilemapId, layerId, opacity) {
        const tilemap = this.tilemaps.get(tilemapId);
        if (!tilemap) return;

        const layer = tilemap.layers.get(layerId);
        if (layer) {
            layer.opacity = Math.max(0, Math.min(1, opacity));
        }
    }

    /**
     * Remove layer
     * @param {string} tilemapId
     * @param {string} layerId
     */
    removeLayer(tilemapId, layerId) {
        const tilemap = this.tilemaps.get(tilemapId);
        if (!tilemap) return;

        tilemap.layers.delete(layerId);
    }

    /**
     * Clear layer (set all tiles to null)
     * @param {string} tilemapId
     * @param {string} layerId
     */
    clearLayer(tilemapId, layerId) {
        const tilemap = this.tilemaps.get(tilemapId);
        if (!tilemap) return;

        const layer = tilemap.layers.get(layerId);
        if (!layer) return;

        for (let y = 0; y < tilemap.height; y++) {
            for (let x = 0; x < tilemap.width; x++) {
                layer.tiles[y][x] = null;
            }
        }
    }

    /**
     * Autotile (basic implementation)
     * Sets tile based on neighbors
     * @param {string} tilemapId
     * @param {string} layerId
     * @param {number} x
     * @param {number} y
     * @param {Array} autotileSet - Array of 16 tile indices for each combination
     */
    autotile(tilemapId, layerId, x, y, autotileSet) {
        const tilemap = this.tilemaps.get(tilemapId);
        if (!tilemap) return;

        const layer = tilemap.layers.get(layerId);
        if (!layer) return;

        // Check neighbors (top, right, bottom, left)
        const neighbors = [
            this.getTile(tilemapId, layerId, x, y - 1) !== null ? 1 : 0,
            this.getTile(tilemapId, layerId, x + 1, y) !== null ? 1 : 0,
            this.getTile(tilemapId, layerId, x, y + 1) !== null ? 1 : 0,
            this.getTile(tilemapId, layerId, x - 1, y) !== null ? 1 : 0
        ];

        // Calculate index (4-bit bitmask)
        const index = neighbors[0] * 8 + neighbors[1] * 4 + neighbors[2] * 2 + neighbors[3];

        // Set tile from autotile set
        if (autotileSet[index] !== undefined) {
            this.setTile(tilemapId, layerId, x, y, autotileSet[index]);
        }
    }

    /**
     * Export tilemap to JSON
     * @param {string} tilemapId
     * @returns {string}
     */
    exportTilemap(tilemapId) {
        const tilemap = this.tilemaps.get(tilemapId);
        if (!tilemap) return null;

        const data = {
            width: tilemap.width,
            height: tilemap.height,
            tileWidth: tilemap.tileWidth,
            tileHeight: tilemap.tileHeight,
            defaultTilesetId: tilemap.defaultTilesetId,
            properties: tilemap.properties,
            layers: []
        };

        tilemap.layers.forEach((layer, layerId) => {
            data.layers.push({
                id: layerId,
                tilesetId: layer.tilesetId,
                visible: layer.visible,
                opacity: layer.opacity,
                zIndex: layer.zIndex,
                tiles: layer.tiles
            });
        });

        return JSON.stringify(data, null, 2);
    }

    /**
     * Import tilemap from JSON
     * @param {string} tilemapId
     * @param {string} jsonData
     */
    importTilemap(tilemapId, jsonData) {
        try {
            const data = JSON.parse(jsonData);

            this.createTilemap(tilemapId, {
                width: data.width,
                height: data.height,
                tileWidth: data.tileWidth,
                tileHeight: data.tileHeight,
                defaultTilesetId: data.defaultTilesetId
            });

            const tilemap = this.tilemaps.get(tilemapId);
            tilemap.properties = data.properties || {};

            data.layers.forEach(layerData => {
                tilemap.layers.set(layerData.id, {
                    tiles: layerData.tiles,
                    tilesetId: layerData.tilesetId,
                    visible: layerData.visible,
                    opacity: layerData.opacity,
                    zIndex: layerData.zIndex
                });
            });

            return true;
        } catch (error) {
            console.error('Failed to import tilemap:', error);
            return false;
        }
    }

    /**
     * Remove tilemap
     * @param {string} tilemapId
     */
    removeTilemap(tilemapId) {
        this.tilemaps.delete(tilemapId);
    }

    /**
     * Remove tileset
     * @param {string} tilesetId
     */
    removeTileset(tilesetId) {
        this.tilesets.delete(tilesetId);
    }

    /**
     * Get tilemap
     * @param {string} tilemapId
     * @returns {object}
     */
    getTilemap(tilemapId) {
        return this.tilemaps.get(tilemapId);
    }

    /**
     * Get tileset
     * @param {string} tilesetId
     * @returns {object}
     */
    getTileset(tilesetId) {
        return this.tilesets.get(tilesetId);
    }

    /**
     * Clear all tilemaps
     */
    clear() {
        this.tilemaps.clear();
        this.tilesets.clear();
    }

    /**
     * Reset system
     */
    reset() {
        this.clear();
    }
}

// Create singleton instance
const tilemapSystem = new TilemapSystem();

export default tilemapSystem;
