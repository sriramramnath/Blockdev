/**
 * Enhanced AI Block Workspace Integration
 * This module handles the integration between AI-generated blocks and the actual Scratch workspace
 */

import { handleAISuggestion, createBlockJSON } from './ai-block-generator';

/**
 * Enhanced AI Block Integration Service
 * Manages the complete workflow from text input to blocks in workspace
 */
class AIBlockWorkspaceIntegration {
    constructor(blocksInstance) {
        this.blocksInstance = blocksInstance;
        this.workspace = null;
        this.vm = null;
        this.generatedBlocks = new Map(); // Track generated blocks
    // Bind helpers
    this.isKnownBlockType = this.isKnownBlockType.bind(this);
    this.normalizeToKnownBlock = this.normalizeToKnownBlock.bind(this);
    this.sanitizeNumber = this.sanitizeNumber.bind(this);
    }

    /**
     * Initialize the integration with the workspace
     */
    initialize(workspace, vm) {
        this.workspace = workspace;
        this.vm = vm;
        console.log('AI Block Workspace Integration initialized');
    }

    /**
     * Process natural language input and generate blocks in the workspace
     * @param {string} text - Natural language description
     * @returns {Promise<Object>} Result with success status and block info
     */
    async processTextToBlocks(text) {
        try {
            // If text is actually an array of block objects (from the AI response parsing)
            let blockDefinitions;
            if (Array.isArray(text)) {
                blockDefinitions = text;
            } else {
                // Generate block definitions from text
                blockDefinitions = handleAISuggestion(text);
            }
            
            // Normalize to known Scratch blocks and sanitize defaults
            if (Array.isArray(blockDefinitions)) {
                blockDefinitions = blockDefinitions
                    .map(this.normalizeToKnownBlock)
                    .filter(Boolean)
                    .filter(b => this.isKnownBlockType(b.id));
            }

            if (!blockDefinitions || blockDefinitions.length === 0) {
                return {
                    success: false,
                    message: 'No blocks could be generated from the provided text',
                    blocks: []
                };
            }

            // Dedupe by id+serialized defaults to avoid multiple identical stacks
            const unique = [];
            const seen = new Set();
            for (const b of blockDefinitions) {
                const sig = b.id + '|' + JSON.stringify(b.defaultValues || {});
                if (!seen.has(sig)) { seen.add(sig); unique.push(b); }
            }
            blockDefinitions = unique;

            const addedBlocks = [];
            const failedBlocks = [];

            // Clear existing AI blocks first
            this.clearGeneratedBlocks();

            // Process each generated block and create them in sequence
            for (let i = 0; i < blockDefinitions.length; i++) {
                const blockDef = blockDefinitions[i];
                try {
                    const result = await this.addBlockToWorkspace(blockDef, i);
                    if (result.success) {
                        addedBlocks.push(result.block);
                    } else {
                        failedBlocks.push({ blockDef, error: result.error });
                    }
                } catch (error) {
                    failedBlocks.push({ blockDef, error: error.message });
                }
            }

            // Connect the blocks in sequence if multiple blocks were created
            if (addedBlocks.length > 1) {
                this.connectBlocksInSequence(addedBlocks);
            }

            return {
                success: addedBlocks.length > 0,
                message: `Successfully added ${addedBlocks.length} block(s) to workspace`,
                blocks: addedBlocks,
                failed: failedBlocks,
                totalGenerated: blockDefinitions.length
            };

        } catch (error) {
            console.error('Error processing text to blocks:', error);
            return {
                success: false,
                message: `Error processing request: ${error.message}`,
                blocks: []
            };
        }
    }

    /**
     * Check if a block type/opcode is registered in ScratchBlocks
     */
    isKnownBlockType(type) {
        try {
            const SB = this.blocksInstance.ScratchBlocks || (typeof window !== 'undefined' ? window.ScratchBlocks : null);
            return !!(SB && SB.Blocks && SB.Blocks[type]);
        } catch {
            return false;
        }
    }

    /**
     * Normalize fuzzy AI output to real Scratch opcodes and defaults
     */
    normalizeToKnownBlock(block) {
        if (!block || !block.id) return null;
        if (this.isKnownBlockType(block.id)) return block;

        const text = `${block.label || ''} ${block.id || ''}`.toLowerCase();
        const out = { ...block };
        const set = (id, category, defaults) => ({
            ...out,
            id,
            category: category || out.category,
            defaultValues: { ...(out.defaultValues || {}), ...(defaults || {}) }
        });

        if (/\bmove\b/.test(text)) return set('motion_movesteps', 'motion', { STEPS: this.sanitizeNumber(out.defaultValues?.STEPS, '10') });
        if (/\bturn\b.*(right|clockwise)/.test(text)) return set('motion_turnright', 'motion', { DEGREES: this.sanitizeNumber(out.defaultValues?.DEGREES, '15') });
        if (/\bturn\b.*(left|anticlockwise)/.test(text)) return set('motion_turnleft', 'motion', { DEGREES: this.sanitizeNumber(out.defaultValues?.DEGREES, '15') });
        if (/\bwait\b/.test(text)) return set('control_wait', 'control', { DURATION: this.sanitizeNumber(out.defaultValues?.DURATION || out.defaultValues?.SECS, '1') });
        if (/\brepeat\b/.test(text)) return set('control_repeat', 'control', { TIMES: this.sanitizeNumber(out.defaultValues?.TIMES, '10') });
        if (/\bforever\b/.test(text)) return set('control_forever', 'control');
        if (/(say|message)/.test(text)) return set('looks_say', 'looks', { MESSAGE: out.defaultValues?.MESSAGE || 'Hello!' });
        if (/think/.test(text)) return set('looks_think', 'looks', { MESSAGE: out.defaultValues?.MESSAGE || 'Hmmm...' });

        return null; // Unknown
    }

    /**
     * Coerce an input to a numeric string, or fall back to default
     */
    sanitizeNumber(val, fallback) {
        if (val === undefined || val === null) return String(fallback);
        const s = String(val).trim();
        if (/^[-+]?[0-9]*\.?[0-9]+$/.test(s)) return s;
        return String(fallback);
    }

    /**
     * Add a single block definition to the workspace
     * @param {Object} blockDef - Block definition from AI generator
     * @param {number} index - Position index for sequencing
     * @returns {Promise<Object>} Result with success status and block info
     */
    async addBlockToWorkspace(blockDef, index = 0) {
        try {
            // Since we're using existing Scratch blocks, we don't need to register new definitions
            // Just create the block instance directly
            const blockInstance = await this.createBlockInstance(blockDef, null, index);
            
            // Track the generated block
            this.generatedBlocks.set(blockDef.id + '_' + index, {
                definition: blockDef,
                instance: blockInstance,
                timestamp: Date.now(),
                index: index
            });

            console.log(`Successfully added block "${blockDef.label}" to workspace`);
            
            return {
                success: true,
                block: {
                    id: blockDef.id,
                    label: blockDef.label,
                    type: blockDef.type,
                    category: blockDef.category,
                    instance: blockInstance
                }
            };

        } catch (error) {
            console.error(`Error adding block "${blockDef.label}" to workspace:`, error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Create an actual block instance in the workspace
     * @param {Object} blockDef - Block definition
     * @param {Object} blockJSON - Block JSON for ScratchBlocks
     * @param {number} index - Position index for sequencing
     * @returns {Promise<Object>} Block instance
     */
    async createBlockInstance(blockDef, blockJSON, index = 0) {
        if (!this.workspace) {
            throw new Error('Workspace not initialized');
        }

        try {
            // Calculate position for the new block (stack them vertically)
            const position = this.calculateBlockPosition(index);
            
            // Create block XML string that Scratch can parse
            const blockXML = this.createBlockXML(blockDef, position);
            
            // Use Blockly's XML parser to create the block
            const xmlDoc = this.blocksInstance.ScratchBlocks.Xml.textToDom(blockXML);

            // Instead of domToBlock (single block), use domToWorkspace so entire XML (with values) is handled
            this.blocksInstance.ScratchBlocks.Xml.domToWorkspace(xmlDoc, this.workspace);

            // Grab the most recently added block (the one we just placed)
            const topBlocks = this.workspace.getTopBlocks(false);
            const block = topBlocks[topBlocks.length - 1];

            // Make the block glow briefly to highlight it
            this.highlightNewBlock(block);

            return block;

        } catch (error) {
            console.error('Error creating block instance:', error);
            throw error;
        }
    }

    /**
     * Create XML for the block instance
     * @param {Object} blockDef - Block definition
     * @param {Object} position - X, Y coordinates
     * @returns {string} Block XML
     */
    createBlockXML(blockDef, position) {
        const { x, y } = position;
        // Unified XML builder pulling from defaultValues map OR legacy inputs[].value
        let xml = `<xml><block type="${blockDef.id}" x="${x}" y="${y}">`;

        const dv = blockDef.defaultValues || {};
        
        // Also check legacy inputs[].value pattern for backwards compatibility
        if (blockDef.inputs) {
            blockDef.inputs.forEach(input => {
                if (input.value && !dv[input.name]) {
                    dv[input.name] = input.value;
                }
            });
        }

    const numShadow = (val, name, shadowType='math_number', field='NUM') => `\n  <value name="${name}"><shadow type="${shadowType}"><field name="${field}">${this.sanitizeNumber(val, val || '0')}</field></shadow></value>`;
        const textShadow = (val, name) => `\n  <value name="${name}"><shadow type="text"><field name="TEXT">${val}</field></shadow></value>`;

        switch (blockDef.id) {
            case 'motion_movesteps':
                xml += numShadow(this.sanitizeNumber(dv.STEPS || dv.NUM, '10'), 'STEPS');
                break;
            case 'motion_turnleft':
            case 'motion_turnright':
                xml += numShadow(this.sanitizeNumber(dv.DEGREES, '15'), 'DEGREES');
                break;
            case 'looks_say':
            case 'looks_think':
                xml += textShadow(dv.MESSAGE || dv.TEXT || 'Hello!', 'MESSAGE');
                break;
            case 'looks_sayforsecs':
            case 'looks_thinkforsecs':
                xml += textShadow(dv.MESSAGE || dv.TEXT || 'Hello!', 'MESSAGE');
                xml += numShadow(this.sanitizeNumber(dv.SECS || dv.DURATION, '2'), 'SECS');
                break;
            case 'control_wait':
                xml += numShadow(this.sanitizeNumber(dv.DURATION || dv.SECS, '1'), 'DURATION');
                break;
            case 'control_repeat':
                xml += numShadow(this.sanitizeNumber(dv.TIMES || dv.NUM, '10'), 'TIMES');
                break;
            case 'control_forever':
            case 'event_whenflagclicked':
                // no inputs
                break;
            default:
                // Generic handling: create shadows for numeric-looking defaults else text
                Object.entries(dv).forEach(([name, val]) => {
                    if (val === undefined || val === null || val === '') return;
                    if (/^[-+]?[0-9]*\.?[0-9]+$/.test(String(val).trim())) {
                        xml += numShadow(String(val).trim(), name);
                    } else {
                        xml += textShadow(val, name);
                    }
                });
        }

        xml += '\n</block></xml>';
        return xml;
    }

    /**
     * Calculate position for new block to avoid overlapping
     * @param {number} index - Position index for sequencing 
     * @returns {Object} Position with x, y coordinates
     */
    calculateBlockPosition(index = 0) {
        const baseX = 50;
        const baseY = 50;
        const blockHeight = 40; // Approximate height of a block
        
        return {
            x: baseX,
            y: baseY + (index * blockHeight)
        };
    }

    /**
     * Connect blocks in sequence to form a script
     * @param {Array} blocks - Array of block instances to connect
     */
    connectBlocksInSequence(blocks) {
        if (!blocks || blocks.length < 2) return;

        try {
            for (let i = 0; i < blocks.length - 1; i++) {
                const currentBlock = blocks[i].instance;
                const nextBlock = blocks[i + 1].instance;

                if (currentBlock && nextBlock && currentBlock.nextConnection && nextBlock.previousConnection) {
                    // Connect current block's next to next block's previous
                    currentBlock.nextConnection.connect(nextBlock.previousConnection);
                }
            }
            console.log(`Connected ${blocks.length} blocks in sequence`);
        } catch (error) {
            console.error('Error connecting blocks in sequence:', error);
        }
    }

    /**
     * Add runtime implementation for the block
     * @param {Object} blockDef - Block definition
     */
    addBlockRuntime(blockDef) {
        if (!this.vm || !this.vm.runtime) {
            console.warn('VM runtime not available for block implementation');
            return;
        }

        // Add runtime primitive if it doesn't exist
        if (!this.vm.runtime._primitives[blockDef.id]) {
            this.vm.runtime._primitives[blockDef.id] = (args, util) => {
                // Default implementation based on block type
                switch (blockDef.type) {
                    case 'command':
                        console.log(`Executing AI-generated command: ${blockDef.label}`);
                        // Add specific command logic here
                        break;
                    case 'reporter':
                        console.log(`Executing AI-generated reporter: ${blockDef.label}`);
                        return 'AI Generated Value';
                    case 'boolean':
                        console.log(`Executing AI-generated boolean: ${blockDef.label}`);
                        return Math.random() > 0.5;
                    default:
                        console.log(`Executing AI-generated block: ${blockDef.label}`);
                }
            };
        }
    }

    /**
     * Highlight a newly created block
     * @param {Object} blockInstance - Block instance to highlight
     */
    highlightNewBlock(blockInstance) {
        if (blockInstance && blockInstance.id) {
            // Glow the block briefly
            setTimeout(() => {
                this.workspace.glowBlock(blockInstance.id, true);
                setTimeout(() => {
                    this.workspace.glowBlock(blockInstance.id, false);
                }, 1500);
            }, 100);
        }
    }

    /**
     * Get all generated blocks
     * @returns {Array} Array of generated block info
     */
    getGeneratedBlocks() {
        return Array.from(this.generatedBlocks.values());
    }

    /**
     * Clear all generated blocks
     */
    clearGeneratedBlocks() {
        // Remove blocks from workspace
        this.generatedBlocks.forEach((blockInfo) => {
            if (blockInfo.instance && blockInfo.instance.id) {
                try {
                    const block = this.workspace.getBlockById(blockInfo.instance.id);
                    if (block) {
                        block.dispose();
                    }
                } catch (error) {
                    console.warn('Error removing block:', error);
                }
            }
        });

        // Clear tracking
        this.generatedBlocks.clear();
        console.log('All AI-generated blocks cleared');
    }

    /**
     * Export generated blocks for saving/sharing
     * @returns {Object} Export data
     */
    exportGeneratedBlocks() {
        const blocks = this.getGeneratedBlocks();
        return {
            timestamp: Date.now(),
            version: '1.0',
            blocks: blocks.map(block => ({
                definition: block.definition,
                timestamp: block.timestamp
            }))
        };
    }
}

/**
 * Setup function to integrate AI block generation with the Blocks container
 * @param {Object} blocksComponent - The Blocks container component instance
 * @returns {AIBlockWorkspaceIntegration} Integration service instance
 */
export function setupAIBlockWorkspaceIntegration(blocksComponent) {
    const integration = new AIBlockWorkspaceIntegration(blocksComponent);
    
    // Add methods to the blocks component
    blocksComponent.aiBlockIntegration = integration;
    
    // Add convenience methods
    blocksComponent.processTextToBlocks = (text) => {
        return integration.processTextToBlocks(text);
    };
    
    blocksComponent.clearAIBlocks = () => {
        integration.clearGeneratedBlocks();
    };
    
    blocksComponent.getAIBlocks = () => {
        return integration.getGeneratedBlocks();
    };
    
    // Initialize when workspace is ready
    if (blocksComponent.workspace) {
        integration.initialize(blocksComponent.workspace, blocksComponent.props.vm);
    }
    
    // Set up workspace listener for delayed initialization
    const originalSetBlocks = blocksComponent.setBlocks;
    blocksComponent.setBlocks = function(blocks) {
        const result = originalSetBlocks.call(this, blocks);
        
        // Initialize integration when workspace becomes available
        if (this.workspace && this.aiBlockIntegration) {
            this.aiBlockIntegration.initialize(this.workspace, this.props.vm);
        }
        
        return result;
    };
    
    console.log('AI Block Workspace Integration setup complete');
    return integration;
}

export default AIBlockWorkspaceIntegration;
