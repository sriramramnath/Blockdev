/**
 * Simple AI Block Placement System
 * This directly creates blocks in the Scratch workspace without complex integrations
 */

/**
 * Simple function to place blocks directly in workspace
 * @param {Array} blockDefs - Array of block definitions
 * @param {Object} workspace - Scratch workspace instance
 */
function placeBlocksInWorkspace(blockDefs, workspace) {
    console.log('placeBlocksInWorkspace called with:', blockDefs, workspace);
    
    if (!workspace) {
        console.error('No workspace provided to placeBlocksInWorkspace');
        return;
    }
    
    if (!blockDefs || blockDefs.length === 0) {
        console.log('No blocks to place');
        return;
    }

    console.log(`Placing ${blockDefs.length} blocks in workspace`);
    console.log('Workspace type:', workspace.constructor.name);
    console.log('Available workspace methods:', Object.getOwnPropertyNames(workspace.__proto__));
    
    // Check if this is a ScratchBlocks workspace
    if (!workspace.ScratchBlocks && typeof window !== 'undefined' && window.ScratchBlocks) {
        workspace.ScratchBlocks = window.ScratchBlocks;
    }
    
    let currentY = 50;
    const baseX = 50;
    const blockSpacing = 50;
    
    const createdBlocks = [];
    
    blockDefs.forEach((blockDef, index) => {
        try {
            console.log(`Creating block ${index + 1}: ${blockDef.label} (${blockDef.id})`);
            
            // Create XML for the block
            const blockXML = createSimpleBlockXML(blockDef, baseX, currentY);
            console.log('Generated XML:', blockXML);
            
            // Parse the XML and create the block
            const xmlDoc = new DOMParser().parseFromString(blockXML, 'text/xml');
            const blockElement = xmlDoc.documentElement.querySelector('block');
            
            if (blockElement) {
                console.log('Parsed XML element:', blockElement);

                // Try different methods to create the block
                let block = null;

                if (workspace.ScratchBlocks && workspace.ScratchBlocks.Xml && workspace.ScratchBlocks.Xml.domToWorkspace) {
                    console.log('Using ScratchBlocks.Xml.domToWorkspace');
                    workspace.ScratchBlocks.Xml.domToWorkspace(xmlDoc, workspace);
                    const topBlocks = workspace.getTopBlocks(false);
                    block = topBlocks[topBlocks.length - 1];
                } else if (window.ScratchBlocks && window.ScratchBlocks.Xml && window.ScratchBlocks.Xml.domToWorkspace) {
                    console.log('Using window.ScratchBlocks.Xml.domToWorkspace');
                    window.ScratchBlocks.Xml.domToWorkspace(xmlDoc, workspace);
                    const topBlocks = workspace.getTopBlocks(false);
                    block = topBlocks[topBlocks.length - 1];
                } else if (workspace.newBlock) {
                    console.log('Using workspace.newBlock (fallback)');
                    block = workspace.newBlock(blockDef.id);
                    if (block) {
                        block.moveBy(baseX, currentY);
                        block.initSvg();
                        block.render();
                        block.select();
                    }
                } else {
                    console.error('No method available to create blocks');
                }

                if (block) {
                    createdBlocks.push(block);
                    currentY += blockSpacing;

                    console.log(`Successfully created block: ${blockDef.label}`);

                    // Highlight the new block
                    setTimeout(() => {
                        if (block.id && workspace.glowBlock) {
                            workspace.glowBlock(block.id, true);
                            setTimeout(() => {
                                workspace.glowBlock(block.id, false);
                            }, 1000);
                        }
                    }, index * 200);
                } else {
                    console.error(`Failed to create block: ${blockDef.label}`);
                }
            }
        } catch (error) {
            console.error(`Error creating block ${blockDef.label}:`, error);
        }
    });
    
    // Try to connect the blocks in sequence
    if (createdBlocks.length > 1) {
        setTimeout(() => {
            connectBlocks(createdBlocks);
        }, 1000);
    }
    
    console.log(`Successfully placed ${createdBlocks.length} out of ${blockDefs.length} blocks`);
    return createdBlocks;
}

/**
 * Create simple XML for Scratch blocks
 */
function createSimpleBlockXML(blockDef, x, y) {
    let xml = `<xml><block type="${blockDef.id}" x="${x}" y="${y}">`;
    
    // Add input values based on block type
    if (blockDef.inputs && blockDef.inputs.length > 0) {
        blockDef.inputs.forEach(input => {
            const val = (input.value !== undefined && input.value !== null)
                ? input.value
                : (blockDef.defaultValues ? blockDef.defaultValues[input.name] : undefined);

            if (val !== undefined && val !== null) {
                if (!isNaN(Number(val))) {
                    // Use shadow blocks for default values - this is the key fix!
                    xml += `<value name="${input.name}"><shadow type="math_number"><field name="NUM">${val}</field></shadow></value>`;
                } else {
                    // Use shadow blocks for text values too
                    xml += `<value name="${input.name}"><shadow type="text"><field name="TEXT">${val}</field></shadow></value>`;
                }
            }
        });
    }
    
    xml += '</block></xml>';
    return xml;
}

/**
 * Connect blocks in sequence
 */
function connectBlocks(blocks) {
    try {
        for (let i = 0; i < blocks.length - 1; i++) {
            const currentBlock = blocks[i];
            const nextBlock = blocks[i + 1];
            
            if (currentBlock.nextConnection && nextBlock.previousConnection) {
                currentBlock.nextConnection.connect(nextBlock.previousConnection);
            }
        }
        console.log(`Connected ${blocks.length} blocks in sequence`);
    } catch (error) {
        console.error('Error connecting blocks:', error);
    }
}

// Export for use
export { placeBlocksInWorkspace, createSimpleBlockXML, connectBlocks };
